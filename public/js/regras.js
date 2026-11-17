// Índice = dia da semana de Date.getDay() (0 = domingo). null = fechado.
export const FUNCIONAMENTO = [
  null,
  { abre: '08:00', fecha: '18:00' },
  { abre: '08:00', fecha: '18:00' },
  { abre: '08:00', fecha: '18:00' },
  { abre: '08:00', fecha: '18:00' },
  { abre: '08:00', fecha: '18:00' },
  { abre: '08:00', fecha: '12:00' }
];

export const INTERVALO_MINUTOS = 30;

export const STATUS = {
  agendado: 'Agendado',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

const CAMPOS_OBRIGATORIOS = {
  cliente: 'Cliente',
  telefone: 'Telefone',
  servicoId: 'Serviço',
  profissionalId: 'Profissional',
  data: 'Data',
  horario: 'Horário'
};

export function dataISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function paraMinutos(horario) {
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
}

export function paraHorario(totalMinutos) {
  const horas = String(Math.floor(totalMinutos / 60)).padStart(2, '0');
  const minutos = String(totalMinutos % 60).padStart(2, '0');
  return `${horas}:${minutos}`;
}

function minutosAgora() {
  const agora = new Date();
  return agora.getHours() * 60 + agora.getMinutes();
}

export function normalizar(texto = '') {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function buscarPorId(lista, id) {
  return lista.find(item => item.id === id);
}

export function precoDoAgendamento(agendamento, servicos) {
  const servico = buscarPorId(servicos, agendamento.servicoId);
  return servico ? servico.preco : 0;
}

export function verificarDia(data, feriados) {
  if (data < dataISO()) {
    return 'Não é possível agendar em uma data que já passou.';
  }

  const diaSemana = new Date(`${data}T00:00:00`).getDay();
  if (!FUNCIONAMENTO[diaSemana]) {
    return 'O estúdio não abre aos domingos.';
  }

  const feriado = feriados.find(item => item.data === data);
  if (feriado) {
    return `O estúdio estará fechado: feriado de ${feriado.nome}.`;
  }

  return null;
}

// Dois atendimentos se chocam quando um começa antes do outro terminar.
function haConflito(inicio, fim, ocupados) {
  return ocupados.some(ocupado => inicio < ocupado.fim && fim > ocupado.inicio);
}

function periodosOcupados({ agendamentos, servicos, profissionalId, data, idIgnorado }) {
  return agendamentos
    .filter(agendamento =>
      agendamento.profissionalId === profissionalId &&
      agendamento.data === data &&
      agendamento.status !== 'cancelado' &&
      agendamento.id !== idIgnorado
    )
    .map(agendamento => {
      const servico = buscarPorId(servicos, agendamento.servicoId);
      const inicio = paraMinutos(agendamento.horario);
      return { inicio, fim: inicio + (servico ? servico.duracao : INTERVALO_MINUTOS) };
    });
}

export function gerarHorariosLivres({ data, servico, profissionalId, agendamentos, servicos, feriados, idIgnorado = null }) {
  if (!data || !servico || !profissionalId || verificarDia(data, feriados)) {
    return [];
  }

  const { abre, fecha } = FUNCIONAMENTO[new Date(`${data}T00:00:00`).getDay()];
  const ocupados = periodosOcupados({ agendamentos, servicos, profissionalId, data, idIgnorado });
  const ehHoje = data === dataISO();
  const livres = [];

  for (let inicio = paraMinutos(abre); inicio + servico.duracao <= paraMinutos(fecha); inicio += INTERVALO_MINUTOS) {
    if (ehHoje && inicio <= minutosAgora()) {
      continue;
    }

    if (!haConflito(inicio, inicio + servico.duracao, ocupados)) {
      livres.push(paraHorario(inicio));
    }
  }

  return livres;
}

export function validarAgendamento(dados, { servicos, profissionais, agendamentos, feriados, idIgnorado = null }) {
  const erros = [];

  for (const [campo, nome] of Object.entries(CAMPOS_OBRIGATORIOS)) {
    if (!dados[campo]) {
      erros.push({ campo, mensagem: `O campo ${nome} é obrigatório.` });
    }
  }

  if (erros.length > 0) {
    return erros;
  }

  if (dados.cliente.length < 3) {
    erros.push({ campo: 'cliente', mensagem: 'O nome do cliente deve ter pelo menos 3 letras.' });
  }

  const digitos = dados.telefone.replace(/\D/g, '');
  if (digitos.length < 10 || digitos.length > 11) {
    erros.push({ campo: 'telefone', mensagem: 'Informe o telefone com DDD (10 ou 11 dígitos).' });
  }

  const servico = buscarPorId(servicos, dados.servicoId);
  const profissional = buscarPorId(profissionais, dados.profissionalId);

  if (!servico) {
    erros.push({ campo: 'servicoId', mensagem: 'Selecione um serviço válido.' });
  }

  if (!profissional) {
    erros.push({ campo: 'profissionalId', mensagem: 'Selecione um profissional válido.' });
  } else if (servico && !profissional.servicos.includes(servico.id)) {
    erros.push({ campo: 'profissionalId', mensagem: `${profissional.nome} não realiza o serviço ${servico.nome}.` });
  }

  const erroDia = verificarDia(dados.data, feriados);
  if (erroDia) {
    erros.push({ campo: 'data', mensagem: erroDia });
  } else if (servico && profissional) {
    const livres = gerarHorariosLivres({
      data: dados.data,
      servico,
      profissionalId: profissional.id,
      agendamentos,
      servicos,
      feriados,
      idIgnorado
    });

    if (!livres.includes(dados.horario)) {
      erros.push({ campo: 'horario', mensagem: 'Este horário não está mais disponível para o profissional escolhido.' });
    }
  }

  return erros;
}

// Só faz sentido concluir um atendimento cujo horário já chegou.
export function podeConcluir(agendamento) {
  const hoje = dataISO();
  if (agendamento.data < hoje) {
    return true;
  }
  return agendamento.data === hoje && paraMinutos(agendamento.horario) <= minutosAgora();
}

export function estaPendente(agendamento) {
  return agendamento.status === 'agendado' && agendamento.data < dataISO();
}

export function calcularIndicadores(agendamentos, servicos) {
  const hoje = dataISO();
  const emAberto = agendamentos.filter(agendamento => agendamento.status === 'agendado');
  const concluidos = agendamentos.filter(agendamento => agendamento.status === 'concluido');

  return {
    hoje: agendamentos.filter(agendamento => agendamento.data === hoje && agendamento.status !== 'cancelado').length,
    proximos: emAberto.filter(agendamento => agendamento.data >= hoje).length,
    faturamentoPrevisto: emAberto.reduce((total, agendamento) => total + precoDoAgendamento(agendamento, servicos), 0),
    faturamentoRealizado: concluidos.reduce((total, agendamento) => total + precoDoAgendamento(agendamento, servicos), 0),
    maisProcurado: servicoMaisProcurado(agendamentos, servicos)
  };
}

function servicoMaisProcurado(agendamentos, servicos) {
  const contagem = agendamentos
    .filter(agendamento => agendamento.status !== 'cancelado')
    .reduce((acumulado, agendamento) => {
      acumulado[agendamento.servicoId] = (acumulado[agendamento.servicoId] || 0) + 1;
      return acumulado;
    }, {});

  let idMaisProcurado = null;
  let maiorQuantidade = 0;

  for (const id in contagem) {
    if (contagem[id] > maiorQuantidade) {
      maiorQuantidade = contagem[id];
      idMaisProcurado = Number(id);
    }
  }

  const servico = buscarPorId(servicos, idMaisProcurado);
  return servico ? { nome: servico.nome, quantidade: maiorQuantidade } : null;
}

export function filtrarAgendamentos(agendamentos, filtros) {
  const termo = normalizar(filtros.busca);

  return agendamentos.filter(agendamento => {
    const atendeBusca = !termo || normalizar(agendamento.cliente).includes(termo);
    const atendeStatus = filtros.status === 'todos' || agendamento.status === filtros.status;
    const atendeProfissional = !filtros.profissionalId || agendamento.profissionalId === filtros.profissionalId;
    const atendeData = !filtros.data || agendamento.data === filtros.data;

    return atendeBusca && atendeStatus && atendeProfissional && atendeData;
  });
}

export function ordenarAgendamentos(agendamentos, criterio, servicos) {
  const copia = [...agendamentos];
  const momento = agendamento => `${agendamento.data} ${agendamento.horario}`;

  if (criterio === 'cliente') {
    copia.sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR'));
  } else if (criterio === 'recentes') {
    copia.sort((a, b) => momento(b).localeCompare(momento(a)));
  } else if (criterio === 'valor') {
    copia.sort((a, b) => precoDoAgendamento(b, servicos) - precoDoAgendamento(a, servicos));
  } else {
    copia.sort((a, b) => momento(a).localeCompare(momento(b)));
  }

  return copia;
}
