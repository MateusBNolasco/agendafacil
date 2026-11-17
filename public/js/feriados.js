const URL_FERIADOS = 'https://brasilapi.com.br/api/feriados/v1';
const CHAVE_CACHE = 'agendafacil:feriados';

function lerCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(CHAVE_CACHE));
    return cache && typeof cache === 'object' ? cache : {};
  } catch {
    localStorage.removeItem(CHAVE_CACHE);
    return {};
  }
}

// Os feriados de um ano não mudam, por isso ficam guardados no navegador
// e a BrasilAPI só é consultada na primeira vez.
export async function buscarFeriados(ano) {
  const cache = lerCache();
  if (Array.isArray(cache[ano])) {
    return cache[ano];
  }

  const resposta = await fetch(`${URL_FERIADOS}/${ano}`);
  if (!resposta.ok) {
    throw new Error(`A BrasilAPI não retornou os feriados de ${ano}.`);
  }

  const dados = await resposta.json();
  const feriados = dados.map(feriado => ({ data: feriado.date, nome: feriado.name }));

  cache[ano] = feriados;
  localStorage.setItem(CHAVE_CACHE, JSON.stringify(cache));

  return feriados;
}
