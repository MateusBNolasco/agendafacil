import * as api from './api.js';
import { buscarFeriados } from './feriados.js';
import { formatarData, formatarMoeda, mascararTelefone } from './formatacao.js';
import {
  buscarPorId,
  calcularIndicadores,
  dataISO,
  filtrarAgendamentos,
  gerarHorariosLivres,
  ordenarAgendamentos,
  podeConcluir,
  validarAgendamento,
  verificarDia
} from './regras.js';
import {
  definirCarregando,
  definirStatusApi,
  limparErros,
  mostrarErros,
  mostrarMensagem,
  preencherOpcoes,
  renderizarIndicadores,
  renderizarLista
} from './ui.js';

// Cópia local dos dados da API. Toda alteração passa pela API primeiro
// e só depois atualiza o estado e redesenha a tela (atualizarTela).
const estado = {
  servicos: [],
  profissionais: [],
  agendamentos: [],
  feriados: [],
  editandoId: null
};

const form = document.querySelector('#form-agendamento');
const tituloForm = document.querySelector('#titulo-form');
const botaoSalvar = document.querySelector('#btn-salvar');
const botaoCancelarEdicao = document.querySelector('#btn-cancelar-edicao');
const avisoDia = document.querySelector('#aviso-dia');
const resumo = document.querySelector('#resumo');
const botaoTema = document.querySelector('#btn-tema');
const textoTema = document.querySelector('#texto-tema');
const CHAVE_TEMA = 'agendafacil:tema';

const campos = {
  cliente: document.querySelector('#cliente'),
  telefone: document.querySelector('#telefone'),
  servicoId: document.querySelector('#servico'),
  profissionalId: document.querySelector('#profissional'),
  data: document.querySelector('#data'),
  horario: document.querySelector('#horario'),
  observacao: document.querySelector('#observacao')
};

const filtros = {
  busca: document.querySelector('#busca'),
  status: document.querySelector('#filtro-status'),
  profissional: document.querySelector('#filtro-profissional'),
  data: document.querySelector('#filtro-data'),
  ordenacao: document.querySelector('#ordenacao')
};

function aplicarTema(tema, salvar = true) {
  const noturno = tema === 'noturno';
  document.documentElement.dataset.tema = tema;
  botaoTema.setAttribute('aria-pressed', String(noturno));
  botaoTema.setAttribute('aria-label', noturno ? 'Ativar modo diurno' : 'Ativar modo noturno');
  textoTema.textContent = noturno ? 'Modo diurno' : 'Modo noturno';
  botaoTema.querySelector('.botao-tema__icone').textContent = noturno ? '☀' : '☾';

  if (salvar) {
    localStorage.setItem(CHAVE_TEMA, tema);
  }
}

function iniciarTema() {
  const temaSalvo = localStorage.getItem(CHAVE_TEMA);
  aplicarTema(temaSalvo === 'noturno' ? 'noturno' : 'diurno', false);

  botaoTema.addEventListener('click', () => {
    const proximoTema = document.documentElement.dataset.tema === 'noturno' ? 'diurno' : 'noturno';
    aplicarTema(proximoTema);
  });
}

function servicoSelecionado() {
  return buscarPorId(estado.servicos, Number(campos.servicoId.value));
}

function atualizarProfissionais() {
  const servico = servicoSelecionado();
  const escolhaAnterior = campos.profissionalId.value;

  if (!servico) {
    preencherOpcoes(campos.profissionalId, [], 'Escolha o serviço primeiro');
    campos.profissionalId.disabled = true;
    return;
  }

  const habilitados = estado.profissionais
    .filter(profissional => profissional.servicos.includes(servico.id))
    .map(profissional => ({ valor: profissional.id, texto: profissional.nome }));

  preencherOpcoes(campos.profissionalId, habilitados, 'Selecione o profissional');
  campos.profissionalId.disabled = false;

  if (habilitados.some(opcao => String(opcao.valor) === escolhaAnterior)) {
    campos.profissionalId.value = escolhaAnterior;
  }
}

function atualizarHorarios(horarioDesejado = campos.horario.value) {
  const servico = servicoSelecionado();
  const profissionalId = Number(campos.profissionalId.value);
  const data = campos.data.value;
  const erroDia = data ? verificarDia(data, estado.feriados) : null;

  avisoDia.textContent = erroDia || '';
  avisoDia.hidden = !erroDia;

  if (!servico || !profissionalId || !data || erroDia) {
    preencherOpcoes(campos.horario, [], '—');
    campos.horario.disabled = true;
    return;
  }

  const livres = gerarHorariosLivres({
    data,
    servico,
    profissionalId,
    agendamentos: estado.agendamentos,
    servicos: estado.servicos,
    feriados: estado.feriados,
    idIgnorado: estado.editandoId
  });

  if (livres.length === 0) {
    preencherOpcoes(campos.horario, [], 'Sem horários livres');
    campos.horario.disabled = true;
    avisoDia.textContent = 'Não há horários livres para este profissional nesta data.';
    avisoDia.hidden = false;
    return;
  }

  preencherOpcoes(campos.horario, livres.map(horario => ({ valor: horario, texto: horario })), 'Selecione');
  campos.horario.disabled = false;

  if (livres.includes(horarioDesejado)) {
    campos.horario.value = horarioDesejado;
  }
}

function atualizarResumo() {
  const servico = servicoSelecionado();

  if (!servico) {
    resumo.hidden = true;
    return;
  }

  resumo.innerHTML = `
    <span>Duração: <strong>${servico.duracao} min</strong></span>
    <span>Valor: <strong>${formatarMoeda(servico.preco)}</strong></span>`;
  resumo.hidden = false;
}

function atualizarCamposDependentes() {
  atualizarProfissionais();
  atualizarHorarios();
  atualizarResumo();
}

function lerFormulario() {
  return {
    cliente: campos.cliente.value.trim(),
    telefone: campos.telefone.value.trim(),
    servicoId: Number(campos.servicoId.value) || null,
    profissionalId: Number(campos.profissionalId.value) || null,
    data: campos.data.value,
    horario: campos.horario.value,
    observacao: campos.observacao.value.trim()
  };
}

function limparFormulario() {
  estado.editandoId = null;
  form.reset();
  limparErros(campos);
  tituloForm.textContent = 'Novo agendamento';
  botaoSalvar.textContent = 'Agendar';
  botaoCancelarEdicao.hidden = true;
  atualizarCamposDependentes();
}

async function salvarAgendamento(evento) {
  evento.preventDefault();

  const dados = lerFormulario();
  const erros = validarAgendamento(dados, { ...estado, idIgnorado: estado.editandoId });

  if (erros.length > 0) {
    mostrarErros(erros, campos);
    return;
  }

  limparErros(campos);
  botaoSalvar.disabled = true;

  try {
    if (estado.editandoId) {
      const original = buscarPorId(estado.agendamentos, estado.editandoId);
      if (!original) {
        const erro = new Error('O agendamento que estava sendo editado não existe mais.');
        erro.status = 404;
        throw erro;
      }

      const atualizado = await api.atualizarAgendamento(original.id, { ...original, ...dados });
      substituirNaLista(atualizado);
      mostrarMensagem(`Agendamento de ${atualizado.cliente} atualizado com sucesso.`);
    } else {
      const novo = await api.criarAgendamento({ ...dados, status: 'agendado' });
      estado.agendamentos.push(novo);
      mostrarMensagem(`Agendamento de ${novo.cliente} confirmado para ${formatarData(novo.data)} às ${novo.horario}.`);
    }

    limparFormulario();
  } catch (erro) {
    tratarErroDaApi(erro);
  } finally {
    botaoSalvar.disabled = false;
    atualizarTela();
  }
}

function substituirNaLista(atualizado) {
  estado.agendamentos = estado.agendamentos.map(agendamento =>
    agendamento.id === atualizado.id ? atualizado : agendamento
  );
}

// Se a API disser que o registro não existe (404), a lista local está
// desatualizada, então ela é buscada de novo.
async function tratarErroDaApi(erro) {
  mostrarMensagem(erro.message, 'erro');

  if (!erro.status) {
    definirStatusApi(false);
  } else if (erro.status === 404) {
    try {
      estado.agendamentos = await api.listarAgendamentos();
      limparFormulario();
      atualizarTela();
    } catch {
      definirStatusApi(false);
    }
  }
}

function iniciarEdicao(id) {
  const agendamento = buscarPorId(estado.agendamentos, id);

  if (!agendamento) {
    mostrarMensagem('Agendamento não encontrado.', 'erro');
    return;
  }

  if (agendamento.status !== 'agendado') {
    mostrarMensagem('Só é possível editar agendamentos em aberto.', 'aviso');
    return;
  }

  estado.editandoId = id;
  limparErros(campos);

  campos.cliente.value = agendamento.cliente;
  campos.telefone.value = agendamento.telefone;
  campos.servicoId.value = agendamento.servicoId;
  atualizarProfissionais();
  campos.profissionalId.value = agendamento.profissionalId;
  campos.data.value = agendamento.data;
  atualizarHorarios(agendamento.horario);
  campos.observacao.value = agendamento.observacao || '';
  atualizarResumo();

  tituloForm.textContent = `Editando: ${agendamento.cliente}`;
  botaoSalvar.textContent = 'Salvar alterações';
  botaoCancelarEdicao.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function mudarStatus(id, novoStatus) {
  const agendamento = buscarPorId(estado.agendamentos, id);

  if (!agendamento) {
    mostrarMensagem('Agendamento não encontrado.', 'erro');
    return;
  }

  if (agendamento.status !== 'agendado') {
    mostrarMensagem('Este agendamento já foi finalizado.', 'aviso');
    return;
  }

  if (novoStatus === 'concluido' && !podeConcluir(agendamento)) {
    mostrarMensagem('Só é possível concluir um atendimento depois do horário marcado.', 'aviso');
    return;
  }

  if (novoStatus === 'cancelado' && !confirm(`Cancelar o agendamento de ${agendamento.cliente}?`)) {
    return;
  }

  try {
    const atualizado = await api.alterarStatus(id, novoStatus);
    substituirNaLista(atualizado);

    if (estado.editandoId === id) {
      limparFormulario();
    }

    const texto = novoStatus === 'concluido' ? 'concluído' : 'cancelado';
    mostrarMensagem(`Agendamento de ${agendamento.cliente} ${texto}.`);
  } catch (erro) {
    tratarErroDaApi(erro);
  } finally {
    atualizarHorarios();
    atualizarTela();
  }
}

async function excluir(id) {
  const agendamento = buscarPorId(estado.agendamentos, id);

  if (!agendamento) {
    mostrarMensagem('Agendamento não encontrado.', 'erro');
    return;
  }

  if (!confirm(`Excluir o agendamento de ${agendamento.cliente}? Esta ação não pode ser desfeita.`)) {
    return;
  }

  try {
    await api.excluirAgendamento(id);
    estado.agendamentos = estado.agendamentos.filter(item => item.id !== id);

    if (estado.editandoId === id) {
      limparFormulario();
    }

    mostrarMensagem(`Agendamento de ${agendamento.cliente} excluído.`);
  } catch (erro) {
    tratarErroDaApi(erro);
  } finally {
    atualizarHorarios();
    atualizarTela();
  }
}

function tratarCliqueNaLista(evento) {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) {
    return;
  }

  const id = Number(botao.dataset.id);
  const acao = botao.dataset.acao;

  if (acao === 'editar') {
    iniciarEdicao(id);
  } else if (acao === 'concluir') {
    mudarStatus(id, 'concluido');
  } else if (acao === 'cancelar') {
    mudarStatus(id, 'cancelado');
  } else if (acao === 'excluir') {
    excluir(id);
  }
}

function lerFiltros() {
  return {
    busca: filtros.busca.value,
    status: filtros.status.value,
    profissionalId: Number(filtros.profissional.value) || null,
    data: filtros.data.value
  };
}

function limparFiltros() {
  filtros.busca.value = '';
  filtros.status.value = 'todos';
  filtros.profissional.value = '';
  filtros.data.value = '';
  filtros.ordenacao.value = 'data';
  atualizarTela();
}

function atualizarTela() {
  renderizarIndicadores(calcularIndicadores(estado.agendamentos, estado.servicos));

  const filtrosAtuais = lerFiltros();
  const filtrados = filtrarAgendamentos(estado.agendamentos, filtrosAtuais);
  const ordenados = ordenarAgendamentos(filtrados, filtros.ordenacao.value, estado.servicos);
  const filtrando = Boolean(
    filtrosAtuais.busca.trim() || filtrosAtuais.status !== 'todos' || filtrosAtuais.profissionalId || filtrosAtuais.data
  );

  renderizarLista(ordenados, {
    servicos: estado.servicos,
    profissionais: estado.profissionais,
    total: estado.agendamentos.length,
    filtrando
  });
}

async function carregarFeriados() {
  const ano = new Date().getFullYear();

  try {
    const listas = await Promise.all([buscarFeriados(ano), buscarFeriados(ano + 1)]);
    estado.feriados = listas.flat();
  } catch (erro) {
    mostrarMensagem(`${erro.message} Os feriados não serão bloqueados automaticamente.`, 'aviso');
  }
}

async function carregarDados() {
  definirCarregando(true);

  try {
    const [servicos, profissionais, agendamentos] = await Promise.all([
      api.listarServicos(),
      api.listarProfissionais(),
      api.listarAgendamentos()
    ]);

    estado.servicos = servicos;
    estado.profissionais = profissionais;
    estado.agendamentos = agendamentos;
    definirStatusApi(true);
  } catch (erro) {
    definirStatusApi(false);
    mostrarMensagem(erro.message, 'erro');
  } finally {
    definirCarregando(false);
  }
}

function preencherSelects() {
  const opcoesServicos = estado.servicos.map(servico => ({
    valor: servico.id,
    texto: `${servico.nome} — ${formatarMoeda(servico.preco)}`
  }));

  const opcoesProfissionais = estado.profissionais.map(profissional => ({
    valor: profissional.id,
    texto: profissional.nome
  }));

  preencherOpcoes(campos.servicoId, opcoesServicos, 'Selecione o serviço');
  preencherOpcoes(filtros.profissional, opcoesProfissionais, 'Toda a equipe');
}

function registrarEventos() {
  form.addEventListener('submit', salvarAgendamento);
  botaoCancelarEdicao.addEventListener('click', limparFormulario);

  campos.telefone.addEventListener('input', () => {
    campos.telefone.value = mascararTelefone(campos.telefone.value);
  });

  campos.servicoId.addEventListener('change', atualizarCamposDependentes);
  campos.profissionalId.addEventListener('change', () => atualizarHorarios());
  campos.data.addEventListener('change', () => atualizarHorarios());

  document.querySelector('#lista-agendamentos').addEventListener('click', tratarCliqueNaLista);

  filtros.busca.addEventListener('input', atualizarTela);
  [filtros.status, filtros.profissional, filtros.data, filtros.ordenacao].forEach(filtro => {
    filtro.addEventListener('change', atualizarTela);
  });
  document.querySelector('#btn-limpar-filtros').addEventListener('click', limparFiltros);
}

async function iniciar() {
  campos.data.min = dataISO();
  campos.data.max = `${new Date().getFullYear() + 1}-12-31`;
  iniciarTema();
  registrarEventos();

  await Promise.all([carregarFeriados(), carregarDados()]);

  preencherSelects();
  atualizarTela();
}

iniciar();
