const URL_API = 'http://localhost:3400';

// Centraliza todas as chamadas à API: verifica a resposta e transforma
// falhas de rede e códigos de erro em mensagens claras para o usuário.
async function requisitar(caminho, opcoes = {}) {
  let resposta;

  try {
    resposta = await fetch(`${URL_API}${caminho}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opcoes
    });
  } catch {
    throw new Error('Não foi possível conectar à API. Verifique se o servidor está rodando (npm start).');
  }

  if (resposta.status === 404) {
    const erro = new Error('Registro não encontrado. Ele pode ter sido excluído.');
    erro.status = 404;
    throw erro;
  }

  if (!resposta.ok) {
    const erro = new Error(`A API respondeu com erro ${resposta.status}. Tente novamente.`);
    erro.status = resposta.status;
    throw erro;
  }

  return resposta.json();
}

export function listarServicos() {
  return requisitar('/servicos');
}

export function listarProfissionais() {
  return requisitar('/profissionais');
}

export function listarAgendamentos() {
  return requisitar('/agendamentos');
}

export function criarAgendamento(agendamento) {
  return requisitar('/agendamentos', {
    method: 'POST',
    body: JSON.stringify(agendamento)
  });
}

export function atualizarAgendamento(id, agendamento) {
  return requisitar(`/agendamentos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(agendamento)
  });
}

export function alterarStatus(id, status) {
  return requisitar(`/agendamentos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export function excluirAgendamento(id) {
  return requisitar(`/agendamentos/${id}`, { method: 'DELETE' });
}
