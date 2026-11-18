import { STATUS, buscarPorId, estaPendente, podeConcluir, precoDoAgendamento } from './regras.js';
import { escaparHtml, formatarData, formatarMoeda, nomeDoDia } from './formatacao.js';

const elementos = {
  mensagem: document.querySelector('#mensagem'),
  erros: document.querySelector('#erros'),
  lista: document.querySelector('#lista-agendamentos'),
  listaVazia: document.querySelector('#lista-vazia'),
  contador: document.querySelector('#contador'),
  statusApi: document.querySelector('#status-api'),
  carregando: document.querySelector('#carregando')
};

let temporizadorMensagem;

export function mostrarMensagem(texto, tipo = 'sucesso') {
  clearTimeout(temporizadorMensagem);
  elementos.mensagem.textContent = texto;
  elementos.mensagem.className = `mensagem mensagem--${tipo}`;
  elementos.mensagem.hidden = false;

  if (tipo === 'sucesso') {
    temporizadorMensagem = setTimeout(() => {
      elementos.mensagem.hidden = true;
    }, 5000);
  }
}

export function mostrarErros(erros, campos) {
  limparErros(campos);

  elementos.erros.innerHTML = erros.map(erro => `<li>${escaparHtml(erro.mensagem)}</li>`).join('');
  elementos.erros.hidden = false;

  erros.forEach(erro => {
    const campo = campos[erro.campo];
    if (campo) {
      campo.closest('.campo').classList.add('campo--invalido');
    }
  });

  campos[erros[0].campo]?.focus();
}

export function limparErros(campos) {
  elementos.erros.hidden = true;
  elementos.erros.innerHTML = '';
  Object.values(campos).forEach(campo => campo.closest('.campo')?.classList.remove('campo--invalido'));
}

export function preencherOpcoes(select, itens, textoPadrao) {
  const opcoes = itens.map(item => `<option value="${escaparHtml(item.valor)}">${escaparHtml(item.texto)}</option>`);
  select.innerHTML = `<option value="">${textoPadrao}</option>${opcoes.join('')}`;
}

export function definirStatusApi(online) {
  elementos.statusApi.textContent = online ? 'API conectada' : 'API desconectada';
  elementos.statusApi.classList.toggle('selo-api--online', online);
  elementos.statusApi.classList.toggle('selo-api--offline', !online);
}

export function definirCarregando(ativo) {
  elementos.carregando.hidden = !ativo;
}

export function renderizarIndicadores(indicadores) {
  document.querySelector('#ind-hoje').textContent = indicadores.hoje;
  document.querySelector('#ind-proximos').textContent = indicadores.proximos;
  document.querySelector('#ind-previsto').textContent = formatarMoeda(indicadores.faturamentoPrevisto);
  document.querySelector('#ind-realizado').textContent = formatarMoeda(indicadores.faturamentoRealizado);
  document.querySelector('#ind-cancelados').textContent = indicadores.cancelados;

  const servico = indicadores.maisProcurado;
  document.querySelector('#ind-servico').textContent = servico ? servico.nome : '—';
  document.querySelector('#ind-servico-qtd').textContent = servico
    ? `${servico.quantidade} ${servico.quantidade === 1 ? 'agendamento' : 'agendamentos'}`
    : 'sem agendamentos';
}

function criarBotoes(agendamento) {
  const botoes = [];

  if (agendamento.status === 'agendado') {
    if (podeConcluir(agendamento)) {
      botoes.push(['concluir', 'Concluir']);
    }
    botoes.push(['editar', 'Editar'], ['cancelar', 'Cancelar']);
  }
  botoes.push(['excluir', 'Excluir']);

  return botoes
    .map(([acao, texto]) => `<button type="button" class="acao acao--${acao}" data-acao="${acao}" data-id="${agendamento.id}">${texto}</button>`)
    .join('');
}

function criarCartao(agendamento, servicos, profissionais) {
  const servico = buscarPorId(servicos, agendamento.servicoId);
  const profissional = buscarPorId(profissionais, agendamento.profissionalId);
  const pendente = estaPendente(agendamento);
  const selo = pendente
    ? '<span class="selo selo--pendente">Aguardando baixa</span>'
    : `<span class="selo selo--${escaparHtml(agendamento.status)}">${STATUS[agendamento.status] || '—'}</span>`;
  const observacao = agendamento.observacao
    ? `<p class="cartao__obs">“${escaparHtml(agendamento.observacao)}”</p>`
    : '';

  return `
    <li class="cartao cartao--${escaparHtml(agendamento.status)}">
      <div class="cartao__quando">
        <span class="cartao__hora">${escaparHtml(agendamento.horario)}</span>
        <span class="cartao__dia">${escaparHtml(`${nomeDoDia(agendamento.data)} · ${formatarData(agendamento.data).slice(0, 5)}`)}</span>
      </div>
      <div>
        <h3 class="cartao__cliente">${escaparHtml(agendamento.cliente)}</h3>
        <p class="cartao__detalhes">${escaparHtml(servico ? servico.nome : 'Serviço removido')} · ${escaparHtml(profissional ? profissional.nome : 'Profissional removido')}</p>
        <p class="cartao__detalhes">${escaparHtml(agendamento.telefone)}${servico ? ` · ${servico.duracao} min` : ''}</p>
        ${observacao}
      </div>
      <div class="cartao__lado">
        ${selo}
        <strong class="cartao__valor">${formatarMoeda(precoDoAgendamento(agendamento, servicos))}</strong>
        <div class="cartao__acoes">${criarBotoes(agendamento)}</div>
      </div>
    </li>`;
}

export function renderizarLista(agendamentos, { servicos, profissionais, total, filtrando }) {
  elementos.lista.innerHTML = agendamentos.map(agendamento => criarCartao(agendamento, servicos, profissionais)).join('');
  elementos.contador.textContent = `${agendamentos.length} de ${total} ${total === 1 ? 'agendamento' : 'agendamentos'}`;

  if (total === 0) {
    elementos.listaVazia.textContent = 'Nenhum agendamento cadastrado ainda. Use o formulário para criar o primeiro.';
    elementos.listaVazia.hidden = false;
  } else if (agendamentos.length === 0 && filtrando) {
    elementos.listaVazia.textContent = 'Nenhum agendamento encontrado com esses filtros.';
    elementos.listaVazia.hidden = false;
  } else {
    elementos.listaVazia.hidden = true;
  }
}
