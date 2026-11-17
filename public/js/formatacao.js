const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor) {
  return moeda.format(valor);
}

export function formatarData(data) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function nomeDoDia(data) {
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

export function formatarDataExtenso(data) {
  return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export function mascararTelefone(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);

  if (digitos.length === 0) {
    return '';
  } else if (digitos.length <= 2) {
    return `(${digitos}`;
  } else if (digitos.length <= 6) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  } else if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }

  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

// Impede que um nome digitado com tags HTML seja interpretado pela página.
export function escaparHtml(texto) {
  const substituicoes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(texto).replace(/[&<>"']/g, caractere => substituicoes[caractere]);
}
