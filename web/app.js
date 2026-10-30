(function () {
  'use strict';

  var LARGURA = 1920;
  var ALTURA = 1080;
  var TRANSICAO_MS = 600;

  var palco;
  var trilho;
  var progresso;
  var barraProgresso;
  var pontos;
  var selo;
  var modelo = null;
  var paginaAtual = null;
  var indiceAtual = 0;
  var restante = 0;
  var duracaoAtual = 15000;
  var ultimoQuadro = 0;
  var quadroProgresso = 0;
  var transicionando = false;
  var navegacaoPendente = null;
  var carregando = false;
  var mouseDentro = false;
  var pausaManual = false;
  var ultimoPercentual = -1;
  var timerRecarga = null;
  var recargaPendente = false;
  var tentarNaTroca = false;
  var alterandoMes = false;

  function porId(id) { return document.getElementById(id); }

  function ajustarEscala() {
    var escala = Math.min(window.innerWidth / LARGURA, window.innerHeight / ALTURA);
    palco.style.left = Math.max(0, (window.innerWidth - LARGURA * escala) / 2) + 'px';
    palco.style.top = Math.max(0, (window.innerHeight - ALTURA * escala) / 2) + 'px';
    palco.style.transform = 'scale(' + escala + ')';
  }

  function atualizarIdentidade() {
    var parametros = modelo.parametros;
    porId('empresa').textContent = parametros.empresa || 'Painel de Vendas';
    porId('nome-carregamento').textContent = parametros.empresa || 'Painel de Vendas';
    porId('periodo-label').textContent = parametros.periodoLabel;
    porId('atualizado-em').textContent = 'Atualizado até ' + Dados.formatarData(parametros.baseAtualizadaAte);
    document.title = 'Painel de Vendas' + (parametros.empresa ? ' · ' + parametros.empresa : '');
    montarSeletorMes();
  }

  function atualizarCabecalho() {
    var item = modelo.roteiro[indiceAtual];
    porId('titulo-pagina').textContent = item.titulo;
    porId('pergunta-pagina').textContent = item.pergunta;
    porId('mensagem-pagina').textContent = item.mensagem;
    Array.prototype.forEach.call(pontos.children, function (ponto, indice) {
      var ativo = indice === indiceAtual;
      ponto.classList.toggle('ativo', ativo);
      ponto.setAttribute('aria-current', ativo ? 'page' : 'false');
    });
  }

  function montarPontos() {
    pontos.textContent = '';
    modelo.roteiro.forEach(function (item, indice) {
      var ponto = document.createElement('button');
      ponto.type = 'button';
      ponto.className = 'ponto';
      ponto.setAttribute('data-indice', indice);
      ponto.setAttribute('aria-label', 'Abrir P' + item.numero + ' — ' + item.titulo);
      ponto.title = 'P' + item.numero + ' · ' + item.titulo;
      pontos.appendChild(ponto);
    });
  }

  function pausado() { return mouseDentro || pausaManual; }

  function atualizarPausa() {
    var estado = porId('estado-reproducao');
    estado.hidden = !pausado();
    estado.textContent = mouseDentro && !pausaManual ? 'Pausado · mouse sobre o painel' : 'Pausado';
    palco.classList.toggle('pausado', pausado());
  }

  function alternarPausa() {
    pausaManual = !pausaManual;
    atualizarPausa();
  }

  function finalizadas(animacoes) {
    return Promise.all(animacoes.filter(Boolean).map(function (animacao) {
      return animacao.finished.catch(function () { return null; });
    }));
  }

  async function mostrarPagina(indice, opcoes) {
    if (!modelo) return;
    opcoes = opcoes || {};
    if (transicionando) {
      navegacaoPendente = { indice: indice, opcoes: opcoes };
      return;
    }

    transicionando = true;
    indiceAtual = (indice + modelo.roteiro.length) % modelo.roteiro.length;
    var item = modelo.roteiro[indiceAtual];
    duracaoAtual = item.duracaoSeg * 1000;
    atualizarCabecalho();

    var anterior = paginaAtual;
    var nova = Paginas.render(modelo, item);
    trilho.appendChild(nova.elemento);
    nova.parar = Paginas.iniciar(nova, pausado);

    var entrada = nova.elemento.animate([
      { opacity: 0, transform: 'scale(1.012)' },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: TRANSICAO_MS, easing: 'ease-in-out', fill: 'both' });

    var saida = null;
    if (anterior) {
      saida = anterior.elemento.animate([
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(.986)' }
      ], { duration: TRANSICAO_MS, easing: 'ease-in-out', fill: 'both' });
    }

    await finalizadas([entrada, saida]);

    if (anterior) {
      if (anterior.parar) anterior.parar();
      anterior.elemento.remove();
    }
    entrada.cancel();
    if (saida) saida.cancel();

    paginaAtual = nova;
    restante = typeof opcoes.preservarTempo === 'number'
      ? Math.min(opcoes.preservarTempo, duracaoAtual)
      : duracaoAtual;
    transicionando = false;
    ultimoQuadro = performance.now();

    if (navegacaoPendente) {
      var pendente = navegacaoPendente;
      navegacaoPendente = null;
      await mostrarPagina(pendente.indice, pendente.opcoes);
    }
    if (tentarNaTroca && !carregando) {
      tentarNaTroca = false;
      carregarDados();
    }
  }

  function avancar() { mostrarPagina(indiceAtual + 1); }
  function voltar() { mostrarPagina(indiceAtual - 1); }

  function atualizarProgresso(agora) {
    var delta = ultimoQuadro ? Math.min(100, Math.max(0, agora - ultimoQuadro)) : 0;
    ultimoQuadro = agora;

    if (modelo && palco.dataset.estado === 'pronto' && !transicionando && !pausado() && !document.hidden) {
      restante -= delta;
      if (restante <= 0) {
        restante = 0;
        avancar();
      }
    }

    var decorrido = duracaoAtual ? Math.max(0, Math.min(1, 1 - restante / duracaoAtual)) : 0;
    progresso.style.transform = 'scaleX(' + decorrido + ')';
    var percentual = Math.round(decorrido * 100);
    if (percentual !== ultimoPercentual) {
      barraProgresso.setAttribute('aria-valuenow', percentual);
      ultimoPercentual = percentual;
    }
    quadroProgresso = requestAnimationFrame(atualizarProgresso);
  }

  function agendarRecarga() {
    if (!modelo) return;
    if (timerRecarga) clearTimeout(timerRecarga);
    timerRecarga = setTimeout(function () {
      timerRecarga = null;
      if (carregando) recargaPendente = true;
      else carregarDados();
    }, 2000);
  }

  function montarSeletorMes() {
    var parametros = modelo.parametros;
    var opcoes = porId('seletor-mes-opcoes');
    var data = parametros.baseAtualizadaAte;
    var limite = 12;
    if (data && parametros.anoAtual === data.getUTCFullYear()) limite = data.getUTCMonth() + 1;
    else if (data && parametros.anoAtual > data.getUTCFullYear()) limite = 0;
    porId('seletor-mes').hidden = limite === 0;
    opcoes.textContent = '';
    for (let mes = 1; mes <= limite; mes++) {
      var botao = document.createElement('button');
      botao.type = 'button';
      botao.setAttribute('data-mes', mes);
      botao.textContent = Dados.nomeMes(mes) + '/' + parametros.anoAtual;
      botao.className = mes === parametros.mesReferencia ? 'atual' : '';
      botao.disabled = alterandoMes;
      opcoes.appendChild(botao);
    }
  }

  async function selecionarMes(mes) {
    if (alterandoMes || !modelo || mes === modelo.parametros.mesReferencia) return;
    alterandoMes = true;
    montarSeletorMes();
    selo.textContent = 'atualizando…';
    selo.hidden = false;
    try {
      await Dados.alterarMes(mes);
      await carregarDados();
    } catch (erro) {
      selo.textContent = 'não foi possível alterar o mês · dados anteriores mantidos';
      selo.hidden = false;
    } finally {
      alterandoMes = false;
      montarSeletorMes();
    }
  }

  function mostrarErroInicial(erro) {
    palco.dataset.estado = 'erro';
    porId('nome-carregamento').textContent = 'Não foi possível carregar o painel';
    porId('nome-carregamento').style.fontSize = '42px';
    porId('mensagem-estado').textContent = erro.message;
    porId('mensagem-estado').style.maxWidth = '1200px';
  }

  async function carregarDados() {
    if (carregando) {
      recargaPendente = true;
      return;
    }
    carregando = true;
    recargaPendente = false;
    tentarNaTroca = false;
    var tinhaDados = !!modelo;
    var sucesso = false;
    if (tinhaDados) {
      selo.textContent = 'atualizando…';
      selo.hidden = false;
    }

    try {
      var novoModelo = await Dados.carregarTudo(function (parametros) {
        if (parametros.empresa) porId('nome-carregamento').textContent = parametros.empresa;
      });
      var tempoRestante = restante;
      modelo = novoModelo;
      atualizarIdentidade();
      montarPontos();

      if (!tinhaDados) {
        indiceAtual = 0;
        palco.dataset.estado = 'pronto';
        await mostrarPagina(0);
        quadroProgresso = requestAnimationFrame(atualizarProgresso);
      } else {
        await mostrarPagina(indiceAtual, { preservarTempo: tempoRestante });
      }
      sucesso = true;
    } catch (erro) {
      if (!modelo) mostrarErroInicial(erro);
      else {
        tentarNaTroca = true;
        selo.textContent = 'atualização pendente · exibindo dados anteriores';
      }
    } finally {
      carregando = false;
      if (sucesso) selo.hidden = true;
      if (recargaPendente) {
        recargaPendente = false;
        if (sucesso) agendarRecarga();
        else tentarNaTroca = !!modelo;
      }
    }
  }

  function aoTeclar(evento) {
    if (!modelo || palco.dataset.estado !== 'pronto') return;
    var tag = evento.target && evento.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (evento.target && evento.target.closest && evento.target.closest('.seletor-mes')) return;
    if (evento.key === 'ArrowRight') {
      evento.preventDefault();
      avancar();
    } else if (evento.key === 'ArrowLeft') {
      evento.preventDefault();
      voltar();
    } else if (evento.key === ' ' || evento.code === 'Space') {
      evento.preventDefault();
      alternarPausa();
    }
  }

  function configurarEventos() {
    window.addEventListener('resize', ajustarEscala);
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('visibilitychange', function () { ultimoQuadro = performance.now(); });
    palco.addEventListener('mouseenter', function () {
      mouseDentro = true;
      atualizarPausa();
    });
    palco.addEventListener('mouseleave', function () {
      mouseDentro = false;
      atualizarPausa();
    });
    pontos.addEventListener('click', function (evento) {
      var ponto = evento.target.closest('[data-indice]');
      if (ponto) mostrarPagina(Number(ponto.getAttribute('data-indice')));
    });
    porId('seletor-mes-opcoes').addEventListener('click', function (evento) {
      var botao = evento.target.closest('[data-mes]');
      if (botao) selecionarMes(Number(botao.getAttribute('data-mes')));
    });

    bridge.on('sheetChanged', agendarRecarga);
    bridge.on('ribbonAction', function (dados) {
      if (!dados) return;
      if (dados.tag === 'reload') carregarDados();
      if (!modelo) return;
      if (dados.tag === 'prev') voltar();
      if (dados.tag === 'next') avancar();
      if (dados.tag === 'pause') alternarPausa();
    });

    window.addEventListener('pagehide', function () {
      if (quadroProgresso) cancelAnimationFrame(quadroProgresso);
      if (timerRecarga) clearTimeout(timerRecarga);
      if (paginaAtual && paginaAtual.parar) paginaAtual.parar();
    });
  }

  function iniciar() {
    palco = porId('palco');
    trilho = porId('trilho');
    progresso = porId('progresso');
    barraProgresso = porId('barra-progresso');
    pontos = porId('pontos');
    selo = porId('selo-atualizacao');
    ajustarEscala();

    if (!bridge.available()) {
      palco.dataset.estado = 'fora';
      porId('nome-carregamento').textContent = 'Este painel é exibido pelo Excel';
      porId('nome-carregamento').style.fontSize = '40px';
      porId('mensagem-estado').textContent = 'Abra o workbook no Excel e use Dashboard › Abrir dashboard. Num navegador comum, sem a planilha, não há dados para exibir.';
      return;
    }

    configurarEventos();
    carregarDados();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
