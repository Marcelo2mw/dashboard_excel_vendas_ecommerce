(function () {
  'use strict';

  var CORES = ['#38bdf8', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#fb923c', '#2dd4bf', '#e879f9'];

  function elemento(tag, classe, conteudo) {
    var no = document.createElement(tag);
    if (classe) no.className = classe;
    if (conteudo !== undefined) no.textContent = conteudo;
    return no;
  }

  function painel(titulo, classe) {
    var no = elemento('section', 'painel cartao-animado ' + (classe || ''));
    if (titulo) no.appendChild(elemento('h2', 'painel-titulo', titulo));
    return no;
  }

  function valorAnimado(valor, formato, classe) {
    var no = elemento('div', 'kpi-valor numero ' + (classe || ''));
    no.setAttribute('data-contagem', 'true');
    no.setAttribute('data-valor', valor === null ? 0 : valor);
    no.setAttribute('data-formato', formato || 'numero');
    no.textContent = Dados.formatar(0, formato);
    if (valor === null) {
      no.removeAttribute('data-contagem');
      no.textContent = '—';
    }
    return no;
  }

  function variacao(valor, tipo, anoAnterior, neutra, invertida) {
    var no = elemento('div', 'variacao ' + Dados.polaridade(valor, invertida, neutra));
    no.appendChild(elemento('span', 'seta', Dados.seta(valor)));
    no.appendChild(elemento('span', '', Dados.formatarVariacao(valor, tipo) + ' vs. ' + anoAnterior));
    if (neutra) no.appendChild(elemento('span', 'estavel', '· estável'));
    return no;
  }

  function legenda(itens) {
    var no = elemento('div', 'legenda-grafico');
    itens.forEach(function (item) {
      var entrada = elemento('span', '', item.rotulo);
      var cor = elemento('i', item.tracejada ? 'legenda-linha tracejada' : 'legenda-linha');
      cor.style.setProperty('--cor-legenda', item.cor);
      entrada.insertBefore(cor, entrada.firstChild);
      no.appendChild(entrada);
    });
    return no;
  }

  function cabecalhoGrafico(painel, itens) {
    var topo = elemento('div', 'painel-topo');
    while (painel.firstChild) topo.appendChild(painel.firstChild);
    topo.appendChild(legenda(itens));
    painel.appendChild(topo);
  }

  function diaMes(data) {
    if (!(data instanceof Date)) return '—';
    return String(data.getUTCDate()).padStart(2, '0') + '/' + String(data.getUTCMonth() + 1).padStart(2, '0');
  }

  function barraLivre(escala, cor, classe) {
    var trilho = elemento('div', 'barra-trilho ' + (classe || ''));
    var preenchimento = elemento('div', 'barra-preenchimento barra-animada');
    preenchimento.setAttribute('data-escala', Math.max(0, Math.min(1, escala || 0)));
    preenchimento.style.transform = 'scaleX(0)';
    preenchimento.style.background = cor || '#38bdf8';
    trilho.appendChild(preenchimento);
    return trilho;
  }

  function cartaoKpi(indicador, parametros, tendencia) {
    var cartao = elemento('article', 'cartao-kpi cartao-animado kpi-' + indicador.chave);
    var titulo = indicador.titulo;
    if (indicador.chave === 'receita') titulo += ' · ' + parametros.periodoLabel;
    cartao.appendChild(elemento('div', 'kpi-titulo', titulo));
    cartao.appendChild(valorAnimado(indicador.atual, indicador.formato));
    if (indicador.chave === 'receita') {
      cartao.appendChild(elemento('div', 'kpi-detalhe numero', Dados.formatar(indicador.atual, indicador.formato, true)));
    }
    cartao.appendChild(variacao(indicador.variacao, indicador.tipoVariacao,
      parametros.anoAnterior, indicador.chave === 'nota_media'));
    var valores;
    if (indicador.chave === 'receita') valores = tendencia.map(function (p) { return p.receita; });
    if (indicador.chave === 'pedidos') valores = tendencia.map(function (p) { return p.pedidos; });
    if (indicador.chave === 'ticket_medio') valores = tendencia.map(function (p) { return p.ticket; });
    if (valores) {
      cartao.classList.add('tem-spark');
      var mini = elemento('div', 'mini-grafico');
      mini.appendChild(Graficos.sparkline(valores));
      cartao.appendChild(mini);
    }
    return cartao;
  }

  function cartaoMes(receita, metas, parametros) {
    var cartao = elemento('article', 'cartao-kpi cartao-animado kpi-mes');
    cartao.appendChild(elemento('div', 'kpi-titulo', 'Mês de referência · ' + parametros.mesReferenciaNome));
    cartao.appendChild(valorAnimado(receita.mesAtual, receita.formato));
    var rodape = elemento('div', 'mes-rodape');
    rodape.appendChild(variacao(receita.variacaoMes, receita.tipoVariacao, parametros.anoAnterior));
    rodape.appendChild(elemento('span', 'meta-mes-texto ' + (metas.mes.percentual >= 1 ? 'positiva' : 'neutra'),
      Dados.formatar(metas.mes.percentual, 'percentual') + ' da meta do mês'));
    cartao.appendChild(rodape);
    return cartao;
  }

  function barraMeta(rotulo, percentual, detalhe) {
    var grupo = elemento('div', 'linha-meta');
    var cabecalho = elemento('div', 'linha-meta-cabecalho');
    cabecalho.appendChild(elemento('span', '', rotulo));
    cabecalho.appendChild(elemento('strong', 'numero ' + (percentual >= 1 ? 'positiva' : ''), Dados.formatar(percentual, 'percentual')));
    grupo.appendChild(cabecalho);
    var trilho = barraLivre(percentual, 'linear-gradient(90deg, #38bdf8, #a78bfa)', 'meta-trilho');
    trilho.appendChild(elemento('span', 'meta-limite'));
    grupo.appendChild(trilho);
    grupo.appendChild(elemento('div', 'linha-meta-detalhe numero', detalhe));
    return grupo;
  }

  function renderP1(pagina, modelo) {
    var dados = modelo.paginas[1], parametros = modelo.parametros;
    var grade = elemento('div', 'p1-grade');
    var esquerda = elemento('div', 'p1-esquerda');
    var cartoes = elemento('div', 'p1-kpis');
    dados.indicadores.forEach(function (indicador) { cartoes.appendChild(cartaoKpi(indicador, parametros, dados.tendencia)); });
    var receita = dados.indicadores.filter(function (item) { return item.chave === 'receita'; })[0];
    cartoes.appendChild(cartaoMes(receita, dados.metas, parametros));
    esquerda.appendChild(cartoes);
    var tendencia = painel('Receita dos últimos 12 meses (R$ mil) — meta em linha pontilhada', 'painel-tendencia');
    var grafico = elemento('div', 'grafico-tendencia');
    grafico.appendChild(Graficos.linhaArea(dados.tendencia.map(function (p) { return p.receita; }),
      dados.tendencia.map(function (p) { return p.meta; }), dados.tendencia.map(function (p) { return p.rotulo; })));
    tendencia.appendChild(grafico);
    esquerda.appendChild(tendencia);

    var direita = elemento('div', 'p1-direita');
    var anual = dados.metas.anual;
    var metaAnual = painel('Meta anual de faturamento', 'painel-meta-anual');
    var anel = elemento('div', 'anel-container');
    anel.appendChild(Graficos.anel(anual.percentual));
    metaAnual.appendChild(anel);
    var resumo = elemento('div', 'meta-resumo numero');
    var realizado = elemento('div');
    realizado.appendChild(document.createTextNode('Realizado '));
    realizado.appendChild(elemento('strong', '', Dados.formatar(anual.realizado, 'moeda')));
    realizado.appendChild(document.createTextNode(' de '));
    realizado.appendChild(elemento('strong', '', Dados.formatar(anual.meta, 'moeda')));
    resumo.appendChild(realizado);
    resumo.appendChild(elemento('div', 'meta-resumo-secundario', 'Faltam ' + Dados.formatar(anual.falta, 'moeda') + ' · ' +
      Dados.formatar(anual.diasRestantes, 'numero') + ' dias · ' + Dados.formatar(anual.receitaDiariaNecessaria, 'moeda') + '/dia'));
    metaAnual.appendChild(resumo);
    direita.appendChild(metaAnual);

    var periodo = painel('Metas no período', 'painel-metas-periodo');
    periodo.appendChild(barraMeta('Acumulado ' + parametros.periodoLabel, dados.metas.periodo.percentual,
      'meta ' + Dados.formatar(dados.metas.periodo.meta, 'moeda') + ' · realizado ' + Dados.formatar(anual.realizado, 'moeda')));
    periodo.appendChild(barraMeta(parametros.mesReferenciaNome, dados.metas.mes.percentual,
      'meta ' + Dados.formatar(dados.metas.mes.meta, 'moeda') + ' · realizado ' + Dados.formatar(dados.metas.mes.realizado, 'moeda')));
    periodo.appendChild(elemento('p', 'nota-painel', 'Acima de 100% = meta batida'));
    direita.appendChild(periodo);
    grade.appendChild(esquerda);
    grade.appendChild(direita);
    pagina.appendChild(grade);
  }

  function ultimoComDados(linhas, campo) {
    for (let i = linhas.length - 1; i >= 0; i--) if (typeof linhas[i][campo] === 'number') return linhas[i];
    return {};
  }

  function linhaAcumulado(rotulo, valor, maximo, cor, tracejada) {
    var linha = elemento('div', 'acumulado-linha');
    linha.appendChild(elemento('span', 'acumulado-rotulo', rotulo));
    linha.appendChild(barraLivre((valor || 0) / (maximo || 1), cor, tracejada ? 'barra-tracejada' : ''));
    linha.appendChild(elemento('strong', 'numero', Dados.formatar(valor, 'moeda')));
    return linha;
  }

  function renderP2(pagina, modelo) {
    var dados = modelo.paginas[2], parametros = modelo.parametros;
    var grade = elemento('div', 'p2-grade');
    var mensal = painel('Receita por mês (R$ mil) — ano atual × anterior × meta', 'p2-mensal');
    cabecalhoGrafico(mensal, [
      { rotulo: parametros.anoAtual, cor: '#38bdf8' },
      { rotulo: parametros.anoAnterior, cor: '#64748b', tracejada: true },
      { rotulo: 'Meta', cor: '#b39af8', tracejada: true }
    ]);
    var atual = dados.mensal.map(function (m) { return m.receitaAtual; });
    var futuros = [];
    atual.forEach(function (valor, indice) { if (valor === null) futuros.push(indice); });
    var graficoMensal = elemento('div', 'grafico-flex');
    graficoMensal.appendChild(Graficos.multiLinha([
      { valores: atual, cor: '#38bdf8', area: true, marcadores: true },
      { valores: dados.mensal.map(function (m) { return m.receitaAnterior; }), cor: '#64748b', tracejada: true },
      { valores: dados.mensal.map(function (m) { return m.metaAtual; }), cor: '#b39af8', tracejada: true, pontilhada: true, desenhar: false, fina: true }
    ], dados.mensal.map(function (m) { return m.rotulo; }), { divisorEixo: 1000, rotulosDiscretos: futuros, altura: 350 }));
    mensal.appendChild(graficoMensal);
    if (futuros.length) mensal.appendChild(elemento('p', 'nota-painel', 'Meses sem dados permanecem como lacuna, nunca como zero.'));
    grade.appendChild(mensal);

    var diario = painel('Receita diária — últimos 90 dias', 'p2-diario');
    cabecalhoGrafico(diario, [{ rotulo: 'diária', cor: '#38bdf8' }, { rotulo: 'média móvel 7 d', cor: '#a78bfa' }]);
    var graficoDiario = elemento('div', 'grafico-flex');
    graficoDiario.appendChild(Graficos.multiLinha([
      { valores: dados.diario.map(function (d) { return d.receita; }), cor: '#38bdf8', area: true },
      { valores: dados.diario.map(function (d) { return d.mediaMovel; }), cor: '#a78bfa', fina: true }
    ], dados.diario.map(function (d, i) { return i % 15 === 0 || i === dados.diario.length - 1 ? diaMes(d.data) : ''; }),
      { eixoY: false, altura: 350, largura: 620 }));
    diario.appendChild(graficoDiario);
    grade.appendChild(diario);

    var atualAcum = ultimoComDados(dados.mensal, 'receitaAcumAtual');
    var metaAnual = modelo.paginas[1].metas.anual.meta;
    var acumulado = painel('Acumulado ' + parametros.periodoLabel + ' (R$ mi) — régua até a meta anual de ' + Dados.formatar(metaAnual, 'moeda'), 'p2-acumulado');
    acumulado.appendChild(linhaAcumulado(parametros.anoAtual, atualAcum.receitaAcumAtual, metaAnual, '#38bdf8'));
    acumulado.appendChild(linhaAcumulado('Meta acum.', atualAcum.metaAcum, metaAnual, 'transparent', true));
    acumulado.appendChild(linhaAcumulado(parametros.anoAnterior, atualAcum.receitaAcumAnterior, metaAnual, '#64748b'));
    grade.appendChild(acumulado);

    var melhor = dados.diario.slice().sort(function (a, b) { return (b.receita || 0) - (a.receita || 0); })[0] || {};
    var ultimo = ultimoComDados(dados.diario, 'receita');
    var destaques = elemento('div', 'p2-mini-cards');
    [
      { titulo: 'MELHOR DIA DO PERÍODO', valor: diaMes(melhor.data) + (melhor.diaSemana ? ' · ' + melhor.diaSemana : ''), detalhe: Dados.formatar(melhor.receita, 'moeda', true), cor: '#34d399' },
      { titulo: 'MÉDIA MÓVEL MAIS RECENTE', valor: Dados.formatar(ultimo.mediaMovel, 'moeda'), detalhe: 'média de 7 dias · ' + diaMes(ultimo.data), cor: '#a78bfa' },
      { titulo: 'PEDIDOS NO MELHOR DIA', valor: Dados.formatar(melhor.pedidos, 'numero'), detalhe: diaMes(melhor.data) + ' · pico de receita', cor: '#38bdf8' }
    ].forEach(function (item) {
      var card = elemento('article', 'mini-card cartao-animado');
      card.style.setProperty('--cor-mini', item.cor);
      card.appendChild(elemento('span', 'mini-card-titulo', item.titulo));
      card.appendChild(elemento('strong', 'numero', item.valor));
      card.appendChild(elemento('small', '', item.detalhe));
      destaques.appendChild(card);
    });
    grade.appendChild(destaques);
    pagina.appendChild(grade);
  }

  function renderP3(pagina, modelo) {
    var dados = modelo.paginas[3], parametros = modelo.parametros;
    var grade = elemento('div', 'p3-grade');
    var categorias = painel('Receita por categoria — participação no ano', 'p3-categorias');
    var mapa = elemento('div', 'grafico-flex');
    mapa.appendChild(Graficos.treemap(dados.categorias));
    categorias.appendChild(mapa);
    grade.appendChild(categorias);

    var direita = elemento('div', 'p3-direita');
    var top10 = painel('Top 10 produtos do ano (receita)', 'p3-top10');
    var lista = dados.top10.slice().sort(function (a, b) { return (a.posicao || 0) - (b.posicao || 0); });
    var grafico = elemento('div', 'grafico-flex');
    grafico.appendChild(Graficos.barrasHorizontais(lista.map(function (item) {
      var indiceCategoria = Math.max(0, dados.categorias.findIndex(function (c) { return c.categoria === item.categoria; }));
      return { rotulo: item.produto, prefixo: item.posicao + '. ', valor: item.receita,
        textoValor: Dados.formatar(item.receita, 'moeda'), cor: CORES[indiceCategoria % CORES.length] };
    }), { largura: 980, alturaLinha: 48, larguraRotulo: 355, larguraValor: 125, fonte: 15 }));
    top10.appendChild(grafico);
    direita.appendChild(top10);

    var top5 = painel('Top 5 de ' + parametros.mesReferenciaNome, 'p3-top5');
    var cards = elemento('div', 'p3-top5-cards');
    dados.top5.slice().sort(function (a, b) { return a.posicao - b.posicao; }).forEach(function (item, indice) {
      var card = elemento('article', 'produto-mes');
      var ponto = elemento('i', '');
      ponto.style.background = CORES[indice % CORES.length];
      card.appendChild(ponto);
      card.appendChild(elemento('span', 'produto-mes-nome', item.produto));
      card.appendChild(elemento('strong', 'numero', Dados.formatar(item.receita, 'moeda')));
      card.appendChild(elemento('small', 'numero', Dados.formatar(item.unidades, 'numero') + ' un. no mês'));
      cards.appendChild(card);
    });
    top5.appendChild(cards);
    direita.appendChild(top5);
    grade.appendChild(direita);
    pagina.appendChild(grade);
  }

  function renderP4(pagina, modelo) {
    var dados = modelo.paginas[4];
    var grade = elemento('div', 'p4-grade');
    var mapa = painel('Crescimento da receita por estado — bolhas por latitude/longitude', 'p4-mapa');
    var grafico = elemento('div', 'grafico-flex');
    var primeiraVez = true;
    var desenharMapa = function () {
      if (!grafico.isConnected || !grafico.clientWidth || !grafico.clientHeight) return;
      grafico.innerHTML = '';
      grafico.appendChild(Graficos.bolhas(dados.estados, grafico.clientWidth, grafico.clientHeight));
      if (primeiraVez) {
        primeiraVez = false;
        Graficos.animarDesenhos(grafico);
      }
    };
    if (typeof ResizeObserver === 'function') new ResizeObserver(desenharMapa).observe(grafico);
    desenharMapa();
    mapa.appendChild(grafico);
    mapa.appendChild(legenda([
      { rotulo: 'queda', cor: '#ef4444' }, { rotulo: '< 15%', cor: '#64748b' },
      { rotulo: '15–25%', cor: '#34d399' }, { rotulo: '25–40%', cor: '#2dd4bf' }, { rotulo: '> 40%', cor: '#4ade80' }
    ]));
    grade.appendChild(mapa);

    var regioes = painel('Regiões — receita e crescimento', 'p4-regioes');
    var maxReceita = Math.max.apply(null, dados.regioes.map(function (r) { return r.receitaAtual || 0; }).concat([1]));
    dados.regioes.forEach(function (regiao) {
      var linha = elemento('div', 'regiao-linha');
      var topo = elemento('div', 'regiao-topo');
      topo.appendChild(elemento('strong', '', regiao.regiao));
      topo.appendChild(elemento('span', 'numero ' + Dados.polaridade(regiao.crescimento),
        Dados.seta(regiao.crescimento) + ' ' + Dados.formatarVariacao(regiao.crescimento, '%')));
      linha.appendChild(topo);
      linha.appendChild(barraLivre((regiao.receitaAtual || 0) / maxReceita, '#38bdf8'));
      linha.appendChild(elemento('small', 'numero', Dados.formatar(regiao.receitaAtual, 'moeda') + ' · ' +
        Dados.formatar(regiao.participacao, 'percentual') + ' · prazo ' + Dados.formatar(regiao.prazoAtual, 'dias')));
      regioes.appendChild(linha);
    });
    grade.appendChild(regioes);

    var estados = painel('Maiores estados (receita no ano)', 'p4-estados');
    var maiores = dados.estados.slice().sort(function (a, b) { return (b.receitaAtual || 0) - (a.receitaAtual || 0); }).slice(0, 7);
    var graficoEstados = elemento('div', 'grafico-flex');
    graficoEstados.appendChild(Graficos.barrasHorizontais(maiores.map(function (estado) {
      return { rotulo: estado.uf, valor: estado.receitaAtual, textoValor: Dados.formatar(estado.receitaAtual, 'moeda') +
        '  ' + Dados.formatarVariacao(estado.crescimento, '%'), cor: '#38bdf8' };
    }), { largura: 600, alturaLinha: 54, larguraRotulo: 55, larguraValor: 225, fonte: 15 }));
    estados.appendChild(graficoEstados);
    grade.appendChild(estados);

    var destaque = dados.regioes.slice().sort(function (a, b) { return (b.crescimento || -999) - (a.crescimento || -999); })[0] || {};
    var insight = painel('Região com maior crescimento no período', 'p4-insight');
    insight.appendChild(elemento('h3', '', destaque.regiao || '—'));
    insight.appendChild(elemento('p', '', 'Receita de ' + Dados.formatar(destaque.receitaAtual, 'moeda') + ', com ' +
      Dados.formatar(destaque.participacao, 'percentual') + ' de participação no período.'));
    var stats = elemento('div', 'insight-stats');
    [
      [Dados.formatar(destaque.prazoAtual, 'dias'), 'prazo médio'],
      [Dados.formatarVariacao(destaque.crescimento, '%'), 'crescimento da região'],
      [Dados.formatar(destaque.pctNoPrazo, 'percentual'), 'entregas no prazo']
    ].forEach(function (item) {
      var stat = elemento('div');
      stat.appendChild(elemento('strong', 'numero', item[0]));
      stat.appendChild(elemento('span', '', item[1]));
      stats.appendChild(stat);
    });
    insight.appendChild(stats);
    grade.appendChild(insight);
    pagina.appendChild(grade);
  }

  function cartaoIndicador(indicador, detalhe) {
    var card = elemento('article', 'cartao-kpi cartao-animado cartao-simples');
    card.appendChild(elemento('div', 'kpi-titulo', indicador.titulo));
    card.appendChild(valorAnimado(indicador.valor !== undefined ? indicador.valor : indicador.atual, indicador.formato));
    card.appendChild(elemento('div', 'kpi-detalhe', detalhe || ''));
    return card;
  }

  function renderP5(pagina, modelo) {
    var dados = modelo.paginas[5];
    var grade = elemento('div', 'p5-grade');
    var kpis = elemento('div', 'p5-kpis');
    var indicadores = dados.indicadores;
    [
      [indicadores.baseClientes, 'cadastrados na base'],
      [indicadores.novosClientes, 'no período'],
      [indicadores.ticketNovos, '1ª compra'],
      [indicadores.ticketRecorrentes, 'clientes recorrentes'],
      [indicadores.pedidosPorCliente, 'desde o início da base'],
      [indicadores.ltvMedio, 'por cliente']
    ].forEach(function (item) { kpis.appendChild(cartaoIndicador(item[0], item[1])); });
    grade.appendChild(kpis);

    var mensal = painel('Pedidos por mês — novos × recorrentes', 'p5-mensal');
    cabecalhoGrafico(mensal, [{ rotulo: 'novos', cor: '#a78bfa' }, { rotulo: 'recorrentes', cor: '#38bdf8' }]);
    var graficoMensal = elemento('div', 'grafico-flex');
    graficoMensal.appendChild(Graficos.barrasEmpilhadas([
      { nome: 'recorrentes', valores: dados.mensal.map(function (m) { return m.pedidosRecorrentes; }), cor: '#38bdf8' },
      { nome: 'novos', valores: dados.mensal.map(function (m) { return m.pedidosNovos; }), cor: '#a78bfa' }
    ], dados.mensal.map(function (m) { return m.rotulo; }), {
      topo: dados.mensal.map(function (m) { return Dados.formatar(m.pctRecorrentes, 'percentual'); }), altura: 330
    }));
    mensal.appendChild(graficoMensal);
    grade.appendChild(mensal);

    var faixas = painel('Receita por faixa etária', 'p5-faixas');
    var graficoFaixas = elemento('div', 'grafico-flex');
    graficoFaixas.appendChild(Graficos.barrasHorizontais(dados.faixas.map(function (faixa) {
      return { rotulo: faixa.segmento, valor: faixa.participacao,
        textoValor: Dados.formatar(faixa.participacao, 'percentual') + ' · ticket ' + Dados.formatar(faixa.ticket, 'moeda'), cor: '#38bdf8' };
    }), { largura: 650, alturaLinha: 61, larguraRotulo: 90, larguraValor: 265, fonte: 14 }));
    faixas.appendChild(graficoFaixas);
    grade.appendChild(faixas);

    var genero = painel('Gênero', 'p5-genero');
    var corpoGenero = elemento('div', 'genero-corpo');
    var coresGenero = ['#f472b6', '#38bdf8', '#64748b'];
    var maisRepresentativo = dados.generos.slice().sort(function (a, b) { return (b.participacao || 0) - (a.participacao || 0); })[0] || {};
    corpoGenero.appendChild(Graficos.donut(dados.generos.map(function (item, i) {
      return { rotulo: item.segmento, valor: item.participacao, cor: coresGenero[i % coresGenero.length] };
    }), { centro: Dados.formatar(maisRepresentativo.participacao, 'percentual'), subtitulo: 'maior participação', fonteCentro: 25 }));
    var legendaGenero = elemento('div', 'legenda-detalhada');
    dados.generos.forEach(function (item, i) {
      var linha = elemento('div');
      var nome = elemento('span', '', item.segmento);
      nome.style.setProperty('--cor-legenda', coresGenero[i % coresGenero.length]);
      linha.appendChild(nome);
      linha.appendChild(elemento('strong', 'numero', Dados.formatar(item.participacao, 'percentual')));
      linha.appendChild(elemento('small', 'numero', 'ticket ' + Dados.formatar(item.ticket, 'moeda')));
      legendaGenero.appendChild(linha);
    });
    corpoGenero.appendChild(legendaGenero);
    genero.appendChild(corpoGenero);
    grade.appendChild(genero);

    var frequencia = painel('Frequência de compra — clientes por número de pedidos', 'p5-frequencia');
    var cabecalhoRecorrencia = elemento('div', 'frequencia-receita numero',
      'receita de recorrentes: ' + Dados.formatar(indicadores.receitaRecorrentes.valor, indicadores.receitaRecorrentes.formato) + ' do faturamento');
    frequencia.appendChild(cabecalhoRecorrencia);
    var linhasFrequencia = elemento('div', 'frequencia-linhas');
    dados.frequencias.forEach(function (item, i) {
      var linha = elemento('div', 'frequencia-item');
      linha.appendChild(elemento('span', '', item.faixa));
      linha.appendChild(barraLivre(item.participacao, CORES[i % 2]));
      linha.appendChild(elemento('strong', 'numero', Dados.formatar(item.participacao, 'percentual') + ' · ' +
        Dados.formatar(item.clientes, 'numero') + ' clientes'));
      linhasFrequencia.appendChild(linha);
    });
    frequencia.appendChild(linhasFrequencia);
    grade.appendChild(frequencia);
    pagina.appendChild(grade);
  }

  function renderP6(pagina, modelo) {
    var dados = modelo.paginas[6], parametros = modelo.parametros;
    var grade = elemento('div', 'p6-grade');
    var funil = painel('Funil de conversão (Site + App) — ' + parametros.periodoLabel, 'p6-funil');
    var graficoFunil = elemento('div', 'grafico-flex');
    graficoFunil.appendChild(Graficos.funil(dados.funil));
    funil.appendChild(graficoFunil);
    var final = dados.funil[dados.funil.length - 1] || {};
    funil.appendChild(elemento('p', 'nota-painel', 'Conversão final: ' + Dados.formatar(final.pctTopo, 'percentual') + ' das sessões viram pedidos.'));
    grade.appendChild(funil);

    var direita = elemento('div', 'p6-direita');
    var origens = painel('Origem do tráfego — investimento × retorno', 'p6-origens');
    var tabela = elemento('table', 'tabela-dados tabela-origens');
    var cabecalho = elemento('tr');
    ['ORIGEM', 'INVESTIMENTO', 'RECEITA', 'ROAS', 'CAC'].forEach(function (titulo) { cabecalho.appendChild(elemento('th', '', titulo)); });
    tabela.appendChild(cabecalho);
    var maxReceita = Math.max.apply(null, dados.origens.map(function (o) { return o.receita || 0; }).concat([1]));
    dados.origens.forEach(function (origem, indice) {
      var linha = elemento('tr');
      linha.appendChild(elemento('td', 'texto-forte', origem.origem));
      linha.appendChild(elemento('td', 'numero', Dados.formatar(origem.investimento, 'moeda')));
      var receita = elemento('td', 'numero celula-barra');
      receita.appendChild(elemento('span', '', Dados.formatar(origem.receita, 'moeda')));
      var barraReceita = elemento('i', 'origem-barra');
      barraReceita.style.width = ((origem.receita || 0) / maxReceita * 62) + 'px';
      barraReceita.style.background = CORES[indice % 2];
      receita.appendChild(barraReceita);
      linha.appendChild(receita);
      linha.appendChild(elemento('td', 'numero texto-forte', Dados.formatar(origem.roas, 'multiplo')));
      linha.appendChild(elemento('td', 'numero', Dados.formatar(origem.cac, 'moeda')));
      tabela.appendChild(linha);
    });
    origens.appendChild(tabela);
    direita.appendChild(origens);

    var mensal = painel('Investimento em mídia × ROAS por mês', 'p6-mensal');
    cabecalhoGrafico(mensal, [{ rotulo: 'investimento', cor: '#38bdf8' }, { rotulo: 'ROAS', cor: '#fbbf24' }]);
    var graficoMensal = elemento('div', 'grafico-flex');
    graficoMensal.appendChild(Graficos.combo(dados.mensal.map(function (m) { return m.investimentoPago; }),
      dados.mensal.map(function (m) { return m.roasPago; }), dados.mensal.map(function (m) { return m.rotulo; })));
    mensal.appendChild(graficoMensal);
    direita.appendChild(mensal);
    grade.appendChild(direita);
    pagina.appendChild(grade);
  }

  function renderP7(pagina, modelo) {
    var dados = modelo.paginas[7];
    var grade = elemento('div', 'p7-grade');
    var pico = { valor: -1, dia: '', hora: 0 };
    dados.heatmap.forEach(function (linha) {
      linha.horas.forEach(function (valor, hora) {
        if (typeof valor === 'number' && valor > pico.valor) pico = { valor: valor, dia: linha.dia, hora: hora };
      });
    });
    var heatmap = painel('Pedidos por dia da semana × hora do dia', 'p7-heatmap');
    heatmap.appendChild(elemento('div', 'nota-destaque numero', 'pico: ' + pico.dia + ' ' +
      String(pico.hora).padStart(2, '0') + 'h · ' + Dados.formatar(pico.valor, 'numero') + ' pedidos'));
    var graficoHeatmap = elemento('div', 'grafico-flex');
    graficoHeatmap.appendChild(Graficos.heatmap(dados.heatmap));
    heatmap.appendChild(graficoHeatmap);
    grade.appendChild(heatmap);

    var dias = painel('Pedidos por dia da semana', 'p7-dias');
    var graficoDias = elemento('div', 'grafico-flex');
    graficoDias.appendChild(Graficos.barrasHorizontais(dados.dias.map(function (dia) {
      return { rotulo: dia.dia, valor: dia.pedidos, textoValor: Dados.formatar(dia.pedidos, 'numero'), cor: '#38bdf8' };
    }), { largura: 600, alturaLinha: 54, larguraRotulo: 60, larguraValor: 85, fonte: 15 }));
    dias.appendChild(graficoDias);
    grade.appendChild(dias);

    var canais = painel('Canal de venda por mês (100%)', 'p7-canais');
    cabecalhoGrafico(canais, [{ rotulo: 'Site', cor: '#38bdf8' }, { rotulo: 'App', cor: '#a78bfa' }, { rotulo: 'Marketplace', cor: '#64748b' }]);
    var graficoCanais = elemento('div', 'grafico-flex');
    graficoCanais.appendChild(Graficos.barrasEmpilhadas([
      { nome: 'Marketplace', valores: dados.mensal.map(function (m) { return m.marketplace; }), cor: '#64748b' },
      { nome: 'App', valores: dados.mensal.map(function (m) { return m.app; }), cor: '#a78bfa' },
      { nome: 'Site', valores: dados.mensal.map(function (m) { return m.site; }), cor: '#38bdf8' }
    ], dados.mensal.map(function (m) { return m.rotulo; }), {
      normalizar: true, altura: 260, larguraBarra: 68,
      topo: dados.mensal.map(function (m) { return Dados.formatar(m.pctApp, 'percentual'); })
    }));
    canais.appendChild(graficoCanais);
    grade.appendChild(canais);

    var pagamentos = painel('Formas de pagamento — participação nos pedidos', 'p7-pagamentos');
    var corpo = elemento('div', 'pagamento-corpo');
    var coresPagamento = ['#38bdf8', '#34d399', '#a78bfa', '#64748b'];
    corpo.appendChild(Graficos.donut(dados.pagamentos.map(function (item, i) {
      return { rotulo: item.forma, valor: item.participacao, cor: coresPagamento[i % coresPagamento.length] };
    }), { centro: Dados.formatar(dados.pagamentos[0] && dados.pagamentos[0].participacao, 'percentual'),
      subtitulo: dados.pagamentos[0] ? dados.pagamentos[0].forma : '', fonteCentro: 25 }));
    var lista = elemento('div', 'legenda-detalhada');
    dados.pagamentos.forEach(function (item, i) {
      var linha = elemento('div');
      linha.appendChild(elemento('span', '', item.forma));
      linha.lastChild.style.setProperty('--cor-legenda', coresPagamento[i % coresPagamento.length]);
      linha.appendChild(elemento('strong', 'numero', Dados.formatar(item.participacao, 'percentual')));
      linha.appendChild(elemento('small', 'numero', 'antes ' + Dados.formatar(item.anterior, 'percentual')));
      lista.appendChild(linha);
    });
    corpo.appendChild(lista);
    pagamentos.appendChild(corpo);
    grade.appendChild(pagamentos);
    pagina.appendChild(grade);
  }

  function deltaOperacao(indicador) {
    var no = elemento('div', 'variacao ' + Dados.polaridade(indicador.variacao, indicador.invertida, indicador.neutra));
    no.appendChild(elemento('span', 'seta', Dados.seta(indicador.variacao)));
    no.appendChild(elemento('span', '', Dados.formatarDelta(indicador.variacao, indicador.formato) +
      (indicador.neutra ? ' · estável' : ' vs. ' + Dados.formatar(indicador.anterior, indicador.formato))));
    return no;
  }

  function renderP8(pagina, modelo) {
    var dados = modelo.paginas[8];
    var grade = elemento('div', 'p8-grade');
    var kpis = elemento('div', 'p8-kpis');
    Object.keys(dados.indicadores).forEach(function (chave) {
      var indicador = dados.indicadores[chave];
      var card = cartaoIndicador(indicador, '');
      card.replaceChild(deltaOperacao(indicador), card.lastChild);
      kpis.appendChild(card);
    });
    grade.appendChild(kpis);

    var prazos = painel('Prazo de entrega por região (dias)', 'p8-prazos');
    cabecalhoGrafico(prazos, [{ rotulo: 'atual', cor: '#38bdf8' }, { rotulo: 'anterior', cor: '#64748b' }, { rotulo: 'prometido', cor: '#fbbf24' }]);
    var maxPrazo = Math.max.apply(null, dados.prazos.reduce(function (valores, p) {
      return valores.concat([p.atual || 0, p.anterior || 0, p.prometido || 0]);
    }, [1]));
    dados.prazos.forEach(function (prazo) {
      var linha = elemento('div', 'prazo-linha');
      linha.appendChild(elemento('span', 'prazo-regiao', prazo.regiao));
      var barras = elemento('div', 'prazo-barras');
      barras.appendChild(barraLivre((prazo.anterior || 0) / maxPrazo, '#64748b'));
      var atual = barraLivre((prazo.atual || 0) / maxPrazo, '#38bdf8');
      var marcador = elemento('i', 'prazo-prometido');
      marcador.style.left = Math.min(100, (prazo.prometido || 0) / maxPrazo * 100) + '%';
      marcador.title = 'Prometido: ' + Dados.formatar(prazo.prometido, 'dias');
      atual.appendChild(marcador);
      barras.appendChild(atual);
      linha.appendChild(barras);
      linha.appendChild(elemento('strong', 'numero', Dados.formatar(prazo.atual, 'dias') + ' / ' + Dados.formatar(prazo.anterior, 'dias')));
      prazos.appendChild(linha);
    });
    grade.appendChild(prazos);

    var status = painel('Status dos pedidos do período', 'p8-status');
    var transporte = elemento('div', 'transporte-agora numero');
    transporte.appendChild(elemento('strong', '', Dados.formatar(dados.emTransporte, 'numero') + ' pedidos'));
    transporte.appendChild(document.createTextNode(' em transporte agora'));
    status.appendChild(transporte);
    var barraStatus = elemento('div', 'status-barra');
    dados.status.forEach(function (item, i) {
      var segmento = elemento('span', 'barra-animada');
      segmento.setAttribute('data-escala', 1);
      segmento.style.width = Math.max(0, item.participacao || 0) * 100 + '%';
      segmento.style.background = ['#34d399', '#38bdf8', '#fbbf24', '#f87171'][i % 4];
      segmento.title = item.status + ': ' + Dados.formatar(item.participacao, 'percentual');
      barraStatus.appendChild(segmento);
    });
    status.appendChild(barraStatus);
    status.appendChild(legenda(dados.status.map(function (item, i) {
      return { rotulo: item.status + ' ' + Dados.formatar(item.participacao, 'percentual'), cor: ['#34d399', '#38bdf8', '#fbbf24', '#f87171'][i % 4] };
    })));
    grade.appendChild(status);

    var notas = painel('Distribuição das avaliações', 'p8-notas');
    dados.notas.forEach(function (item) {
      var linha = elemento('div', 'nota-linha');
      linha.appendChild(elemento('span', 'nota-estrela', item.nota + ' ★'));
      linha.appendChild(barraLivre(item.participacao, item.nota === 5 ? '#fbbf24' : '#38bdf8'));
      linha.appendChild(elemento('strong', 'numero', Dados.formatar(item.participacao, 'percentual')));
      linha.appendChild(elemento('small', 'numero', '(' + Dados.formatar(item.avaliacoes, 'numero') + ')'));
      notas.appendChild(linha);
    });
    grade.appendChild(notas);

    var estoque = painel('Estoque em risco — menor cobertura', 'p8-estoque');
    var tabela = elemento('table', 'tabela-dados tabela-estoque');
    var cabecalho = elemento('tr');
    ['PRODUTO', 'ESTOQUE', 'COBERTURA', 'STATUS'].forEach(function (titulo) { cabecalho.appendChild(elemento('th', '', titulo)); });
    tabela.appendChild(cabecalho);
    dados.estoque.slice().sort(function (a, b) { return a.posicao - b.posicao; }).forEach(function (item) {
      var critico = (item.status || '').toLocaleLowerCase('pt-BR').indexOf('crít') >= 0;
      var linha = elemento('tr', critico ? 'linha-critica' : '');
      linha.appendChild(elemento('td', 'texto-forte', item.produto));
      linha.appendChild(elemento('td', 'numero', Dados.formatar(item.atual, 'numero') + ' un.'));
      linha.appendChild(elemento('td', 'numero', Dados.formatar(item.cobertura, 'numero') + ' dias'));
      var celulaStatus = elemento('td');
      celulaStatus.appendChild(elemento('span', 'chip-status ' + (critico ? 'critico' : 'atencao'), item.status));
      linha.appendChild(celulaStatus);
      tabela.appendChild(linha);
    });
    estoque.appendChild(tabela);
    grade.appendChild(estoque);
    pagina.appendChild(grade);
  }

  function iconeDestaque(chave) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('aria-hidden', 'true');
    var caminhos = {
      faturamento_mes: '<path d="M4 25 11 17l5 4 11-14M22 7h5v5"/>',
      meta_mes: '<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><circle cx="16" cy="16" r="2"/>',
      melhor_dia: '<rect x="5" y="7" width="22" height="20" rx="3"/><path d="M10 4v6M22 4v6M5 13h22M11 19l3 3 7-7"/>',
      produto_destaque: '<rect x="6" y="5" width="20" height="16" rx="2"/><path d="M3 25h26"/>',
      categoria_crescimento: '<rect x="8" y="8" width="16" height="16" rx="3"/><path d="M12 2v6M20 2v6M12 24v6M20 24v6M2 12h6M2 20h6M24 12h6M24 20h6"/>',
      estado_crescimento: '<path d="M16 29S6 20 6 12a10 10 0 0 1 20 0c0 8-10 17-10 17Z"/><circle cx="16" cy="12" r="3"/>',
      melhor_roas: '<rect x="3" y="6" width="26" height="20" rx="3"/><path d="m4 8 12 10L28 8"/>',
      satisfacao_mes: '<path d="m16 3 4 8 9 1-6.5 6 1.7 9-8.2-4.5L7.8 27l1.7-9L3 12l9-1Z"/>',
      novos_clientes_mes: '<circle cx="13" cy="10" r="6"/><path d="M3 28c0-7 20-7 20 0M25 8v8M21 12h8"/>'
    };
    svg.innerHTML = caminhos[chave] || caminhos.meta_mes;
    return svg;
  }

  function preencherDestaque(card, item, contar) {
    card.textContent = '';
    var icone = elemento('div', 'destaque-icone');
    icone.appendChild(iconeDestaque(item.chave));
    card.appendChild(icone);
    card.appendChild(elemento('div', 'destaque-titulo', item.titulo));
    var principal = item.nome || Dados.formatarMisto(item.valor, item.formatoValor);
    if (item.chave === 'melhor_roas' && item.nome && item.valor !== null) {
      principal = item.nome + ' · ' + Dados.formatarMisto(item.valor, item.formatoValor);
    }
    var valor = elemento('div', 'destaque-valor numero', principal);
    if (contar && !item.nome && typeof item.valor === 'number') {
      valor.setAttribute('data-contagem', 'true');
      valor.setAttribute('data-valor', item.valor);
      valor.setAttribute('data-formato', item.formatoValor);
      valor.textContent = Dados.formatar(0, item.formatoValor);
    }
    card.appendChild(valor);
    var comparacao = Dados.formatarMisto(item.comparacao, item.formatoComparacao);
    var detalhe = item.legenda;
    if (comparacao !== '—') detalhe = (detalhe ? detalhe + ' ' : '') + comparacao;
    card.appendChild(elemento('div', 'destaque-detalhe', detalhe));
  }

  function iniciarCarrossel(pagina, dados, metas, estaPausado) {
    var principal = pagina.querySelector('.destaque-central');
    var anterior = pagina.querySelector('.destaque-anterior');
    var seguinte = pagina.querySelector('.destaque-seguinte');
    var contador = pagina.querySelector('.destaque-contador');
    var pontos = Array.prototype.slice.call(pagina.querySelectorAll('.destaque-ponto'));
    var indice = 0, quadro = 0, cancelado = false, virando = false, ultimoGiro = performance.now();
    var animacoes = [];
    var reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function mostrar() {
      preencherDestaque(principal, dados[indice], false);
      preencherDestaque(anterior, dados[(indice + dados.length - 1) % dados.length], false);
      preencherDestaque(seguinte, dados[(indice + 1) % dados.length], false);
      contador.textContent = (indice + 1) + ' de ' + dados.length + ' · troca a cada ~2 s';
      pontos.forEach(function (ponto, i) { ponto.classList.toggle('ativo', i === indice); });
    }

    function girar() {
      if (virando || cancelado) return;
      virando = true;
      var saida = principal.animate([
        { transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(-90deg)', opacity: 0 }
      ], { duration: reduzir ? 1 : 260, easing: 'ease-in', fill: 'both' });
      animacoes.push(saida);
      saida.finished.then(function () {
        if (cancelado) return;
        indice = (indice + 1) % dados.length;
        mostrar();
        var entrada = principal.animate([
          { transform: 'rotateY(90deg)', opacity: 0 }, { transform: 'rotateY(0deg)', opacity: 1 }
        ], { duration: reduzir ? 1 : 300, easing: 'ease-out', fill: 'both' });
        animacoes.push(entrada);
        return entrada.finished;
      }).catch(function () {}).then(function () {
        saida.cancel();
        virando = false;
      });
    }

    function tick(agora) {
      if (cancelado) return;
      if (!estaPausado() && !document.hidden && agora - ultimoGiro >= 2000) {
        ultimoGiro = agora;
        girar();
      }
      quadro = requestAnimationFrame(tick);
    }
    if (dados.length > 1) quadro = requestAnimationFrame(tick);

    if (metas.mes.percentual >= 1 && !reduzir) {
      var confetes = pagina.querySelector('.confetes');
      for (let i = 0; i < 20; i++) {
        var pedaco = elemento('i', 'confete');
        pedaco.setAttribute('data-confete', 'true');
        pedaco.style.left = (18 + (i * 37 % 66)) + '%';
        pedaco.style.top = (2 + (i * 17 % 15)) + '%';
        pedaco.style.background = CORES[i % 5];
        confetes.appendChild(pedaco);
        animacoes.push(pedaco.animate([
          { transform: 'translateY(-25px) rotate(0deg)', opacity: 0 },
          { opacity: .75, offset: .2 },
          { transform: 'translateY(250px) rotate(240deg)', opacity: 0 }
        ], { duration: 3800 + (i % 5) * 300, delay: i * 110, iterations: Infinity, easing: 'linear' }));
      }
    }

    return function () {
      cancelado = true;
      if (quadro) cancelAnimationFrame(quadro);
      animacoes.forEach(function (animacao) { animacao.cancel(); });
    };
  }

  function renderP9(pagina, modelo) {
    var dados = modelo.paginas[9];
    var palco = elemento('div', 'p9-palco');
    palco.appendChild(elemento('div', 'confetes'));
    var cartoes = elemento('div', 'p9-cartoes');
    var anterior = elemento('article', 'destaque-card destaque-lateral destaque-anterior');
    var principal = elemento('article', 'destaque-card destaque-central cartao-animado');
    var seguinte = elemento('article', 'destaque-card destaque-lateral destaque-seguinte');
    preencherDestaque(anterior, dados[dados.length - 1], false);
    preencherDestaque(principal, dados[0], true);
    preencherDestaque(seguinte, dados[1] || dados[0], false);
    cartoes.appendChild(anterior);
    cartoes.appendChild(principal);
    cartoes.appendChild(seguinte);
    palco.appendChild(cartoes);
    palco.appendChild(elemento('div', 'destaque-contador', '1 de ' + dados.length + ' · troca a cada ~2 s'));
    var pontos = elemento('div', 'destaque-pontos');
    dados.forEach(function (_, indice) {
      pontos.appendChild(elemento('i', 'destaque-ponto' + (indice === 0 ? ' ativo' : '')));
    });
    palco.appendChild(pontos);
    pagina.appendChild(palco);
    pagina.iniciarEspecial = function (estaPausado) {
      return iniciarCarrossel(pagina, dados, modelo.paginas[1].metas, estaPausado);
    };
  }

  function render(modelo, item) {
    var pagina = elemento('section', 'pagina pagina-' + item.numero);
    pagina.setAttribute('aria-label', 'P' + item.numero + ' — ' + item.titulo);
    var renderizadores = { 1: renderP1, 2: renderP2, 3: renderP3, 4: renderP4, 5: renderP5, 6: renderP6, 7: renderP7, 8: renderP8, 9: renderP9 };
    renderizadores[item.numero](pagina, modelo);
    return { elemento: pagina, parar: null, iniciarEspecial: pagina.iniciarEspecial };
  }

  function iniciar(pagina, estaPausado) {
    var animacoes = [];
    var reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var contadores = Array.prototype.slice.call(pagina.elemento.querySelectorAll('[data-contagem]'));
    var quadro = 0, cancelado = false;
    estaPausado = estaPausado || function () { return false; };

    pagina.elemento.querySelectorAll('.cartao-animado').forEach(function (cartao, indice) {
      animacoes.push(cartao.animate([
        { opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }
      ], { duration: reduzir ? 1 : 580, delay: reduzir ? 0 : 150 + indice * 70,
        easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' }));
    });
    pagina.elemento.querySelectorAll('.barra-animada').forEach(function (barra, indice) {
      var destino = Number(barra.getAttribute('data-escala')) || 0;
      animacoes.push(barra.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(' + destino + ')' }], {
        duration: reduzir ? 1 : 900, delay: reduzir ? 0 : 300 + Math.min(indice, 20) * 55,
        easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both'
      }));
    });
    pagina.elemento.querySelectorAll('.linha-critica').forEach(function (linha, indice) {
      animacoes.push(linha.animate([{ opacity: .45 }, { opacity: 1, offset: .55 }, { opacity: .75 }, { opacity: 1 }], {
        duration: 700, delay: 700 + indice * 120, easing: 'ease-in-out', fill: 'both'
      }));
    });
    animacoes = animacoes.concat(Graficos.animarDesenhos(pagina.elemento));

    function contar(agora) {
      if (cancelado) return;
      var concluido = true;
      contadores.forEach(function (no) {
        if (!no.isConnected || !no.hasAttribute('data-contagem')) return;
        if (!no._inicioContagem) no._inicioContagem = agora + (reduzir ? 0 : 150);
        var progresso = reduzir ? 1 : Math.max(0, Math.min(1, (agora - no._inicioContagem) / 1200));
        if (progresso < 1) concluido = false;
        var suavizado = 1 - Math.pow(1 - progresso, 3);
        var destino = Number(no.getAttribute('data-valor')) || 0;
        var formato = no.getAttribute('data-formato');
        var atual = destino * suavizado;
        if (formato === 'numero' && Number.isInteger(destino)) atual = Math.round(atual);
        no.textContent = Dados.formatar(atual, formato);
      });
      if (!concluido) quadro = requestAnimationFrame(contar);
    }
    if (contadores.length) quadro = requestAnimationFrame(contar);
    var pararEspecial = pagina.iniciarEspecial ? pagina.iniciarEspecial(estaPausado) : null;

    return function () {
      cancelado = true;
      if (quadro) cancelAnimationFrame(quadro);
      if (pararEspecial) pararEspecial();
      animacoes.forEach(function (animacao) { animacao.cancel(); });
    };
  }

  window.Paginas = { render: render, iniciar: iniciar };
})();
