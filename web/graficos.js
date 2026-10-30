(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var sequencia = 0;

  function no(nome, atributos, conteudo) {
    var elemento = document.createElementNS(NS, nome);
    Object.keys(atributos || {}).forEach(function (chave) {
      if (atributos[chave] !== null && atributos[chave] !== undefined) {
        elemento.setAttribute(chave, atributos[chave]);
      }
    });
    if (conteudo !== undefined) elemento.textContent = conteudo;
    return elemento;
  }

  function svg(largura, altura, classe, proporcional) {
    var elemento = no('svg', {
      viewBox: '0 0 ' + largura + ' ' + altura,
      width: '100%', height: '100%',
      preserveAspectRatio: proporcional === false ? 'none' : 'xMidYMid meet',
      'aria-hidden': 'true'
    });
    if (classe) elemento.setAttribute('class', classe);
    return elemento;
  }

  function validos(valores) {
    return valores.filter(function (valor) { return typeof valor === 'number' && isFinite(valor); });
  }

  function pontos(valores, largura, altura, margem, maximo, minimo) {
    var topo = margem.top;
    var base = altura - margem.bottom;
    var esquerda = margem.left;
    var direita = largura - margem.right;
    var amplitude = maximo - minimo || 1;
    return valores.map(function (valor, indice) {
      if (typeof valor !== 'number' || !isFinite(valor)) return null;
      return {
        x: esquerda + (valores.length === 1 ? (direita - esquerda) / 2 : indice * (direita - esquerda) / (valores.length - 1)),
        y: base - (valor - minimo) * (base - topo) / amplitude
      };
    });
  }

  function segmentos(coordenadas) {
    var grupos = [];
    var atual = [];
    coordenadas.forEach(function (ponto) {
      if (!ponto) {
        if (atual.length) grupos.push(atual);
        atual = [];
      } else atual.push(ponto);
    });
    if (atual.length) grupos.push(atual);
    return grupos;
  }

  function caminho(grupo) {
    return grupo.map(function (ponto, indice) {
      return (indice ? 'L' : 'M') + ponto.x.toFixed(2) + ',' + ponto.y.toFixed(2);
    }).join(' ');
  }

  function textoEixo(valor, divisor) {
    var n = valor / (divisor || 1);
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n);
  }

  function sparkline(valores, cor) {
    var largura = 150, altura = 44;
    var numeros = validos(valores);
    var maximo = numeros.length ? Math.max.apply(null, numeros) : 1;
    var minimo = numeros.length ? Math.min.apply(null, numeros) : 0;
    var folga = (maximo - minimo || Math.abs(maximo) || 1) * .12;
    var coordenadas = pontos(valores, largura, altura, { top: 3, right: 3, bottom: 3, left: 3 }, maximo + folga, minimo - folga);
    var grafico = svg(largura, altura, 'sparkline', false);
    segmentos(coordenadas).forEach(function (grupo) {
      grafico.appendChild(no('path', {
        d: caminho(grupo), fill: 'none', stroke: cor || '#38bdf8', 'stroke-width': 2.5,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'data-desenhar': 'sparkline'
      }));
    });
    return grafico;
  }

  function multiLinha(series, rotulos, opcoes) {
    opcoes = opcoes || {};
    var largura = opcoes.largura || 1160, altura = opcoes.altura || 300;
    var margem = { top: 20, right: 22, bottom: 42, left: opcoes.eixoY === false ? 18 : 62 };
    var todos = [];
    series.forEach(function (serie) { todos = todos.concat(validos(serie.valores)); });
    var maximo = todos.length ? Math.max.apply(null, todos) * 1.1 : 1;
    if (maximo <= 0) maximo = 1;
    var grafico = svg(largura, altura, 'grafico-multi-linha', false);
    var defs = no('defs');
    grafico.appendChild(defs);
    var base = altura - margem.bottom;

    for (let linha = 0; linha <= 4; linha++) {
      let y = margem.top + (base - margem.top) * linha / 4;
      grafico.appendChild(no('line', {
        x1: margem.left, x2: largura - margem.right, y1: y, y2: y,
        stroke: '#26334d', 'stroke-opacity': .55, 'stroke-width': 1
      }));
      if (opcoes.eixoY !== false) {
        grafico.appendChild(no('text', {
          x: margem.left - 10, y: y + 5, 'text-anchor': 'end', fill: '#64748b', 'font-size': 13
        }, textoEixo(maximo * (4 - linha) / 4, opcoes.divisorEixo)));
      }
    }

    series.forEach(function (serie, indiceSerie) {
      var coordenadas = pontos(serie.valores, largura, altura, margem, maximo, 0);
      var cor = serie.cor || '#38bdf8';
      if (serie.area) {
        let id = 'serie-' + (++sequencia);
        let gradiente = no('linearGradient', { id: id, x1: '0', y1: '0', x2: '0', y2: '1' });
        gradiente.appendChild(no('stop', { offset: '0', 'stop-color': cor, 'stop-opacity': .3 }));
        gradiente.appendChild(no('stop', { offset: '1', 'stop-color': cor, 'stop-opacity': .015 }));
        defs.appendChild(gradiente);
        segmentos(coordenadas).forEach(function (grupo) {
          if (grupo.length < 2) return;
          var d = caminho(grupo) + ' L' + grupo[grupo.length - 1].x + ',' + base + ' L' + grupo[0].x + ',' + base + ' Z';
          grafico.appendChild(no('path', { d: d, fill: 'url(#' + id + ')', 'data-area': 'true' }));
        });
      }
      segmentos(coordenadas).forEach(function (grupo) {
        grafico.appendChild(no('path', {
          d: caminho(grupo), fill: 'none', stroke: cor, 'stroke-width': serie.fina ? 2 : 3,
          'stroke-dasharray': serie.tracejada ? (serie.pontilhada ? '2 7' : '9 8') : '',
          'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          'data-desenhar': serie.desenhar === false ? null : 'linha'
        }));
      });
      if (serie.marcadores) {
        coordenadas.forEach(function (ponto) {
          if (!ponto) return;
          grafico.appendChild(no('circle', {
            cx: ponto.x, cy: ponto.y, r: 4, fill: cor, stroke: '#0c1322', 'stroke-width': 2,
            'data-marcador': 'true'
          }));
        });
      }
    });

    var passo = opcoes.rotuloPasso || 1;
    rotulos.forEach(function (rotulo, indice) {
      if (!rotulo || indice % passo) return;
      var x = margem.left + (rotulos.length === 1 ? 0 : indice * (largura - margem.left - margem.right) / (rotulos.length - 1));
      var futuro = opcoes.rotulosDiscretos && opcoes.rotulosDiscretos.indexOf(indice) >= 0;
      grafico.appendChild(no('text', {
        x: x, y: altura - 12, 'text-anchor': 'middle', fill: futuro ? '#334155' : '#94a3bd', 'font-size': 14
      }, rotulo));
    });
    return grafico;
  }

  function linhaArea(valores, metas, rotulos, opcoes) {
    return multiLinha([
      { valores: valores, cor: '#38bdf8', area: true },
      { valores: metas, cor: '#b39af8', tracejada: true, pontilhada: true, desenhar: false, fina: true }
    ], rotulos, Object.assign({ eixoY: false, altura: 220 }, opcoes || {}));
  }

  function barrasHorizontais(itens, opcoes) {
    opcoes = opcoes || {};
    var largura = opcoes.largura || 900;
    var alturaLinha = opcoes.alturaLinha || 54;
    var altura = itens.length * alturaLinha + 8;
    var label = opcoes.larguraRotulo || 330;
    var valor = opcoes.larguraValor || 120;
    var maximo = Math.max.apply(null, validos(itens.map(function (item) { return item.valor; })).concat([1]));
    var grafico = svg(largura, altura, 'grafico-barras-horizontais', false);
    itens.forEach(function (item, indice) {
      var y = indice * alturaLinha + 4;
      var comprimento = Math.max(0, (item.valor || 0) / maximo) * (largura - label - valor);
      grafico.appendChild(no('text', {
        x: 0, y: y + alturaLinha / 2 + 5, fill: '#edf2fa', 'font-size': opcoes.fonte || 16
      }, (item.prefixo || '') + (item.rotulo || '')));
      grafico.appendChild(no('rect', {
        x: label, y: y + alturaLinha / 2 - 8, width: largura - label - valor, height: 16,
        rx: 8, fill: '#1b2740'
      }));
      grafico.appendChild(no('rect', {
        x: label, y: y + alturaLinha / 2 - 8, width: comprimento, height: 16,
        rx: 8, fill: item.cor || '#38bdf8', 'data-barra': 'true', class: 'barra-svg'
      }));
      grafico.appendChild(no('text', {
        x: largura, y: y + alturaLinha / 2 + 5, 'text-anchor': 'end',
        fill: '#edf2fa', 'font-size': opcoes.fonte || 16, 'font-weight': 600
      }, item.textoValor || ''));
    });
    return grafico;
  }

  function barrasEmpilhadas(series, rotulos, opcoes) {
    opcoes = opcoes || {};
    var largura = opcoes.largura || 900, altura = opcoes.altura || 310;
    var margem = { top: 34, right: 18, bottom: 42, left: 18 };
    var base = altura - margem.bottom;
    var totais = rotulos.map(function (_, indice) {
      return series.reduce(function (total, serie) {
        var n = serie.valores[indice];
        return total + (typeof n === 'number' && isFinite(n) ? Math.max(0, n) : 0);
      }, 0);
    });
    var maximo = opcoes.normalizar ? 1 : Math.max.apply(null, totais.concat([1]));
    var espaco = (largura - margem.left - margem.right) / Math.max(1, rotulos.length);
    var larguraBarra = Math.min(opcoes.larguraBarra || 64, espaco * .68);
    var grafico = svg(largura, altura, 'grafico-barras-empilhadas', false);

    rotulos.forEach(function (rotulo, indice) {
      if (!totais[indice]) return;
      var x = margem.left + espaco * indice + (espaco - larguraBarra) / 2;
      var acumulado = 0;
      series.forEach(function (serie) {
        var n = serie.valores[indice];
        if (typeof n !== 'number' || !isFinite(n) || n <= 0) return;
        var proporcao = opcoes.normalizar ? n / totais[indice] : n / maximo;
        var h = proporcao * (base - margem.top);
        var y = base - acumulado - h;
        grafico.appendChild(no('rect', {
          x: x, y: y, width: larguraBarra, height: Math.max(1, h), rx: 3,
          fill: serie.cor, 'data-barra-y': 'true', class: 'barra-svg-vertical'
        }));
        acumulado += h;
      });
      if (opcoes.topo && opcoes.topo[indice]) {
        grafico.appendChild(no('text', {
          x: x + larguraBarra / 2, y: base - acumulado - 10,
          'text-anchor': 'middle', fill: '#94a3bd', 'font-size': 13
        }, opcoes.topo[indice]));
      }
      grafico.appendChild(no('text', {
        x: x + larguraBarra / 2, y: altura - 12, 'text-anchor': 'middle', fill: '#94a3bd', 'font-size': 14
      }, rotulo));
    });
    return grafico;
  }

  function combo(investimentos, roas, rotulos) {
    var largura = 880, altura = 300;
    var margem = { top: 24, right: 24, bottom: 42, left: 24 };
    var base = altura - margem.bottom;
    var maxInvestimento = Math.max.apply(null, validos(investimentos).concat([1])) * 1.12;
    var maxRoas = Math.max.apply(null, validos(roas).concat([1])) * 1.12;
    var espaco = (largura - margem.left - margem.right) / Math.max(1, rotulos.length);
    var larguraBarra = Math.min(58, espaco * .62);
    var grafico = svg(largura, altura, 'grafico-combo', false);
    investimentos.forEach(function (valor, indice) {
      var x = margem.left + espaco * indice + (espaco - larguraBarra) / 2;
      if (typeof valor === 'number' && isFinite(valor)) {
        var h = Math.max(0, valor) / maxInvestimento * (base - margem.top);
        grafico.appendChild(no('rect', {
          x: x, y: base - h, width: larguraBarra, height: h, rx: 6,
          fill: '#38bdf8', 'data-barra-y': 'true', class: 'barra-svg-vertical'
        }));
      }
      grafico.appendChild(no('text', {
        x: x + larguraBarra / 2, y: altura - 12, 'text-anchor': 'middle', fill: '#94a3bd', 'font-size': 14
      }, rotulos[indice] || ''));
    });
    var coordenadas = pontos(roas, largura, altura, margem, maxRoas, 0);
    segmentos(coordenadas).forEach(function (grupo) {
      grafico.appendChild(no('path', {
        d: caminho(grupo), fill: 'none', stroke: '#fbbf24', 'stroke-width': 3,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'data-desenhar': 'roas'
      }));
    });
    return grafico;
  }

  function donut(itens, opcoes) {
    opcoes = opcoes || {};
    var raio = 82, circunferencia = 2 * Math.PI * raio;
    var total = itens.reduce(function (soma, item) { return soma + Math.max(0, item.valor || 0); }, 0) || 1;
    var grafico = svg(240, 240, 'grafico-donut');
    grafico.appendChild(no('circle', { cx: 120, cy: 120, r: raio, fill: 'none', stroke: '#1b2740', 'stroke-width': 34 }));
    var acumulado = 0;
    itens.forEach(function (item) {
      var fracao = Math.max(0, item.valor || 0) / total;
      var comprimento = Math.max(0, fracao * circunferencia - 1.5);
      var arco = no('circle', {
        cx: 120, cy: 120, r: raio, fill: 'none', stroke: item.cor, 'stroke-width': 34,
        transform: 'rotate(' + (-90 + acumulado * 360) + ' 120 120)',
        'stroke-dasharray': comprimento + ' ' + circunferencia,
        'data-donut': 'true', 'data-comprimento': comprimento, 'data-circunferencia': circunferencia
      });
      grafico.appendChild(arco);
      acumulado += fracao;
    });
    grafico.appendChild(no('text', {
      x: 120, y: 120, 'text-anchor': 'middle', fill: '#edf2fa', 'font-size': opcoes.fonteCentro || 28, 'font-weight': 650
    }, opcoes.centro || ''));
    grafico.appendChild(no('text', {
      x: 120, y: 147, 'text-anchor': 'middle', fill: '#94a3bd', 'font-size': 14
    }, opcoes.subtitulo || ''));
    return grafico;
  }

  function anel(percentual) {
    var valor = typeof percentual === 'number' && isFinite(percentual) ? percentual : 0;
    var raio = 112, circunferencia = 2 * Math.PI * raio;
    var destino = circunferencia * (1 - Math.max(0, Math.min(1, valor)));
    var grafico = svg(300, 300, 'anel-meta');
    var id = 'anel-' + (++sequencia);
    var defs = no('defs');
    var gradiente = no('linearGradient', { id: id, x1: '0', y1: '0', x2: '1', y2: '1' });
    gradiente.appendChild(no('stop', { offset: '0', 'stop-color': '#38bdf8' }));
    gradiente.appendChild(no('stop', { offset: '.48', 'stop-color': '#a78bfa' }));
    gradiente.appendChild(no('stop', { offset: '1', 'stop-color': '#b39af8' }));
    defs.appendChild(gradiente);
    grafico.appendChild(defs);
    grafico.appendChild(no('circle', { cx: 150, cy: 150, r: raio, fill: 'none', stroke: '#1b2740', 'stroke-width': 32 }));
    grafico.appendChild(no('circle', {
      cx: 150, cy: 150, r: raio, fill: 'none', stroke: 'url(#' + id + ')', 'stroke-width': 32,
      transform: 'rotate(-90 150 150)', 'stroke-dasharray': circunferencia,
      'stroke-dashoffset': circunferencia, 'data-anel': 'true', 'data-destino': destino
    }));
    var texto = no('text', {
      x: 150, y: 154, 'text-anchor': 'middle', fill: '#edf2fa', 'font-size': 48,
      'font-weight': 650, 'data-contagem': 'true', 'data-valor': valor, 'data-formato': 'percentual'
    }, '0,0%');
    texto.setAttribute('class', 'numero');
    grafico.appendChild(texto);
    grafico.appendChild(no('text', { x: 150, y: 187, 'text-anchor': 'middle', fill: '#94a3bd', 'font-size': 17 }, 'da meta anual'));
    return grafico;
  }

  function treemap(categorias) {
    var largura = 760, altura = 610;
    var grafico = svg(largura, altura, 'grafico-treemap', false);
    var defs = no('defs');
    grafico.appendChild(defs);
    var cores = ['#38bdf8', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#fb923c', '#2dd4bf', '#e879f9'];
    var itens = categorias.slice().sort(function (a, b) { return (b.receitaAtual || 0) - (a.receitaAtual || 0); });

    function dividir(lista, x, y, w, h, horizontal) {
      if (!lista.length) return;
      if (lista.length === 1) {
        var item = lista[0];
        var cor = cores[itens.indexOf(item) % cores.length];
        var id = 'recorte-' + (++sequencia);
        var recorte = no('clipPath', { id: id });
        recorte.appendChild(no('rect', { x: x + 3, y: y + 3, width: Math.max(0, w - 6), height: Math.max(0, h - 6), rx: 10 }));
        defs.appendChild(recorte);
        var grupo = no('g', { 'data-treemap': 'true', 'clip-path': 'url(#' + id + ')' });
        grupo.appendChild(no('rect', {
          x: x + 3, y: y + 3, width: Math.max(0, w - 6), height: Math.max(0, h - 6), rx: 12,
          fill: cor, 'fill-opacity': .12, stroke: cor, 'stroke-opacity': .75, 'stroke-width': 1.5
        }));
        if (w > 72 && h > 58) {
          grupo.appendChild(no('text', {
            x: x + 15, y: y + 28, fill: cor,
            'font-size': Math.max(12, Math.min(18, w / 11)), 'font-weight': 600
          }, item.categoria));
          grupo.appendChild(no('text', {
            x: x + 15, y: y + (h < 100 ? 53 : 62), fill: cor,
            'font-size': Math.max(14, Math.min(25, w / 8.5)), 'font-weight': 650
          }, Dados.formatar(item.receitaAtual, 'moeda')));
          if (h > 128 && w > 150) {
            grupo.appendChild(no('text', { x: x + 15, y: y + 87, fill: '#94a3bd', 'font-size': 13 },
              Dados.formatar(item.participacao, 'percentual') + ' do ano · margem ' + Dados.formatar(item.margem, 'percentual')));
          }
          if (h > 165 && w > 175) {
            grupo.appendChild(no('text', { x: x + 15, y: y + h - 18,
              fill: Dados.polaridade(item.crescimento) === 'negativa' ? '#f87171' : '#34d399', 'font-size': 14 },
              Dados.seta(item.crescimento) + ' ' + Dados.formatarVariacao(item.crescimento, '%') + ' vs. ano anterior'));
          }
        }
        grafico.appendChild(grupo);
        return;
      }
      var total = lista.reduce(function (soma, item) { return soma + Math.max(0, item.receitaAtual || 0); }, 0) || 1;
      var metade = total / 2, soma = 0, corte = 1;
      for (let i = 0; i < lista.length - 1; i++) {
        soma += Math.max(0, lista[i].receitaAtual || 0);
        corte = i + 1;
        if (soma >= metade) break;
      }
      var primeira = lista.slice(0, corte), segunda = lista.slice(corte);
      var peso = primeira.reduce(function (s, item) { return s + Math.max(0, item.receitaAtual || 0); }, 0) / total;
      if (horizontal) {
        dividir(primeira, x, y, w * peso, h, !horizontal);
        dividir(segunda, x + w * peso, y, w * (1 - peso), h, !horizontal);
      } else {
        dividir(primeira, x, y, w, h * peso, !horizontal);
        dividir(segunda, x, y + h * peso, w, h * (1 - peso), !horizontal);
      }
    }
    dividir(itens, 0, 0, largura, altura, true);
    return grafico;
  }

  function corCrescimento(valor) {
    if (typeof valor !== 'number' || !isFinite(valor)) return '#64748b';
    if (valor < 0) return '#ef4444';
    if (valor < .15) return '#64748b';
    if (valor < .25) return '#34d399';
    if (valor < .4) return '#2dd4bf';
    return '#4ade80';
  }

  function bolhas(estados, largura, altura) {
    largura = Math.max(240, Math.round(largura || 620));
    altura = Math.max(240, Math.round(altura || 640));
    var margem = 36;
    var latitudes = validos(estados.map(function (e) { return e.latitude; }));
    var longitudes = validos(estados.map(function (e) { return e.longitude; }));
    var minLat = Math.min.apply(null, latitudes), maxLat = Math.max.apply(null, latitudes);
    var minLon = Math.min.apply(null, longitudes), maxLon = Math.max.apply(null, longitudes);
    var maxReceita = Math.max.apply(null, validos(estados.map(function (e) { return e.receitaAtual; })).concat([1]));
    var grafico = svg(largura, altura, 'grafico-bolhas');

    // Web Mercator: mesma projeção dos tiles do mapa, para as bolhas caírem
    // exatamente sobre o fundo. O zoom inteiro é o maior que ainda deixa os
    // tiles nítidos (escala <= 1) no tamanho real do card.
    function fatorX(lon) { return (lon + 180) / 360 * 256; }
    function fatorY(lat) {
      var rad = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
      return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * 256;
    }
    var escalaBase = Math.min(
      (largura - 2 * margem) / (fatorX(maxLon) - fatorX(minLon) || 1),
      (altura - 2 * margem) / (fatorY(minLat) - fatorY(maxLat) || 1));
    var zoom = Math.max(3, Math.min(10, Math.ceil(Math.log2(escalaBase))));
    var potencia = Math.pow(2, zoom);
    function mundoX(lon) { return fatorX(lon) * potencia; }
    function mundoY(lat) { return fatorY(lat) * potencia; }
    var escala = escalaBase / potencia;
    var deslX = (largura - (mundoX(maxLon) - mundoX(minLon)) * escala) / 2 - mundoX(minLon) * escala;
    var deslY = (altura - (mundoY(minLat) - mundoY(maxLat)) * escala) / 2 - mundoY(maxLat) * escala;

    var tiles = Math.pow(2, zoom);
    for (var tx = Math.floor((0 - deslX) / escala / 256); tx <= Math.floor((largura - deslX) / escala / 256); tx++) {
      for (var ty = Math.floor((0 - deslY) / escala / 256); ty <= Math.floor((altura - deslY) / escala / 256); ty++) {
        if (tx < 0 || tx >= tiles || ty < 0 || ty >= tiles) continue;
        grafico.appendChild(no('image', {
          preserveAspectRatio: 'none',
          href: 'https://tile.openstreetmap.org/' + zoom + '/' + tx + '/' + ty + '.png',
          style: 'filter: invert(.92) hue-rotate(180deg) brightness(.82) contrast(.9)',
          x: tx * 256 * escala + deslX, y: ty * 256 * escala + deslY,
          width: 256 * escala + .5, height: 256 * escala + .5
        }));
      }
    }
    grafico.appendChild(no('text', {
      x: largura - 8, y: altura - 8, 'text-anchor': 'end', fill: '#5b6b8c', 'font-size': 10
    }, '© OpenStreetMap contributors'));

    estados.forEach(function (estado) {
      if (typeof estado.latitude !== 'number' || typeof estado.longitude !== 'number') return;
      var x = mundoX(estado.longitude) * escala + deslX;
      var y = mundoY(estado.latitude) * escala + deslY;
      var raio = 11 + Math.sqrt(Math.max(0, estado.receitaAtual || 0) / maxReceita) * 26;
      var grupo = no('g', { 'data-bolha': 'true' });
      var circulo = no('circle', {
        cx: x, cy: y, r: raio, fill: corCrescimento(estado.crescimento), 'fill-opacity': .8,
        stroke: '#edf2fa', 'stroke-opacity': .25, 'stroke-width': 1
      });
      var titulo = no('title', {}, estado.uf + ' · ' + Dados.formatar(estado.receitaAtual, 'moeda') + ' · ' +
        Dados.formatarVariacao(estado.crescimento, '%'));
      circulo.appendChild(titulo);
      grupo.appendChild(circulo);
      grupo.appendChild(no('text', {
        x: x, y: y + 4, 'text-anchor': 'middle', fill: '#0c1322', 'font-size': raio < 16 ? 10 : 13, 'font-weight': 700
      }, estado.uf));
      if (raio >= 22) {
        grupo.appendChild(no('text', {
          x: x, y: y + 18, 'text-anchor': 'middle', fill: '#0c1322', 'font-size': 10, 'font-weight': 600
        }, Dados.formatarVariacao(estado.crescimento, '%')));
      }
      grafico.appendChild(grupo);
    });
    return grafico;
  }

  function heatmap(linhas) {
    var largura = 1050, altura = 490;
    var margem = { top: 42, right: 12, bottom: 20, left: 62 };
    var cw = (largura - margem.left - margem.right) / 24;
    var ch = (altura - margem.top - margem.bottom) / Math.max(1, linhas.length);
    var valores = [];
    linhas.forEach(function (linha) { valores = valores.concat(validos(linha.horas)); });
    var maximo = Math.max.apply(null, valores.concat([1]));
    var melhor = { valor: -1, linha: -1, hora: -1 };
    var grafico = svg(largura, altura, 'grafico-heatmap', false);
    for (let hora = 0; hora < 24; hora += 2) {
      grafico.appendChild(no('text', {
        x: margem.left + hora * cw + cw / 2, y: 22, 'text-anchor': 'middle', fill: '#94a3bd', 'font-size': 12
      }, String(hora).padStart(2, '0') + 'h'));
    }
    linhas.forEach(function (linha, indiceLinha) {
      grafico.appendChild(no('text', {
        x: 0, y: margem.top + indiceLinha * ch + ch / 2 + 5, fill: '#94a3bd', 'font-size': 14
      }, linha.dia));
      linha.horas.forEach(function (valor, hora) {
        if (typeof valor === 'number' && valor > melhor.valor) melhor = { valor: valor, linha: indiceLinha, hora: hora };
        var intensidade = typeof valor === 'number' ? .09 + Math.max(0, valor) / maximo * .82 : .025;
        var celula = no('rect', {
          x: margem.left + hora * cw + 2, y: margem.top + indiceLinha * ch + 2,
          width: Math.max(1, cw - 4), height: Math.max(1, ch - 4), rx: 4,
          fill: '#38bdf8', 'fill-opacity': intensidade, stroke: '#26334d', 'stroke-width': 1,
          'data-heatmap': 'true', 'data-atraso': (indiceLinha + hora) * 14
        });
        celula.appendChild(no('title', {}, linha.dia + ' · ' + String(hora).padStart(2, '0') + 'h · ' + Dados.formatar(valor, 'numero') + ' pedidos'));
        grafico.appendChild(celula);
      });
    });
    if (melhor.linha >= 0) {
      grafico.appendChild(no('rect', {
        x: margem.left + melhor.hora * cw + 1, y: margem.top + melhor.linha * ch + 1,
        width: cw - 2, height: ch - 2, rx: 5, fill: 'none', stroke: '#fbbf24', 'stroke-width': 2
      }));
    }
    return grafico;
  }

  function funil(etapas) {
    var largura = 750, altura = 570;
    var topo = Math.max.apply(null, validos(etapas.map(function (e) { return e.valor; })).concat([1]));
    var alturaEtapa = altura / Math.max(1, etapas.length);
    var grafico = svg(largura, altura, 'grafico-funil', false);
    etapas.forEach(function (etapa, indice) {
      var larguraAtual = Math.max(150, Math.sqrt((etapa.valor || 0) / topo) * (largura - 160));
      var proxima = etapas[indice + 1];
      var larguraSeguinte = larguraAtual * .92;
      var y = indice * alturaEtapa + 4;
      var centro = (largura - 100) / 2;
      var pontosPoligono = [
        [centro - larguraAtual / 2, y], [centro + larguraAtual / 2, y],
        [centro + larguraSeguinte / 2, y + alturaEtapa - 12], [centro - larguraSeguinte / 2, y + alturaEtapa - 12]
      ].map(function (p) { return p.join(','); }).join(' ');
      var grupo = no('g', { 'data-funil': 'true' });
      grupo.appendChild(no('polygon', { points: pontosPoligono, fill: '#38bdf8', 'fill-opacity': .86 - indice * .08 }));
      grupo.appendChild(no('text', {
        x: centro, y: y + alturaEtapa / 2 - 2, 'text-anchor': 'middle', fill: '#0c1322',
        'font-size': Math.max(12, Math.min(17, larguraAtual / 12)), 'font-weight': 600
      }, etapa.etapa));
      grupo.appendChild(no('text', {
        x: centro, y: y + alturaEtapa / 2 + 23, 'text-anchor': 'middle', fill: '#0c1322', 'font-size': 15
      }, Dados.formatar(etapa.valor, 'numero') + ' · ' + Dados.formatar(etapa.pctTopo, 'percentual')));
      grafico.appendChild(grupo);
      if (proxima && typeof proxima.conversao === 'number') {
        grafico.appendChild(no('text', {
          x: largura - 82, y: y + alturaEtapa - 3, fill: '#94a3bd', 'font-size': 14
        }, '▼ ' + Dados.formatar(proxima.conversao, 'percentual')));
      }
    });
    return grafico;
  }

  function animarDesenhos(raiz) {
    var animacoes = [];
    function animar(elemento, quadros, opcoes) {
      animacoes.push(elemento.animate(quadros, Object.assign({
        duration: 850, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both'
      }, opcoes || {})));
    }

    raiz.querySelectorAll('[data-desenhar]').forEach(function (caminhoSvg, indice) {
      if (!caminhoSvg.getTotalLength) return;
      var comprimento = caminhoSvg.getTotalLength();
      if (!comprimento) return;
      caminhoSvg.style.strokeDasharray = comprimento + ' ' + comprimento;
      caminhoSvg.style.strokeDashoffset = comprimento;
      animar(caminhoSvg, [{ strokeDashoffset: comprimento }, { strokeDashoffset: 0 }], { duration: 1100, delay: 280 + indice * 45 });
    });
    raiz.querySelectorAll('[data-area]').forEach(function (area) {
      animar(area, [{ opacity: 0 }, { opacity: 1 }], { duration: 800, delay: 570 });
    });
    raiz.querySelectorAll('[data-anel]').forEach(function (arco) {
      animar(arco, [
        { strokeDashoffset: Number(arco.getAttribute('stroke-dashoffset')) },
        { strokeDashoffset: Number(arco.getAttribute('data-destino')) }
      ], { duration: 1200, delay: 180 });
    });
    raiz.querySelectorAll('[data-donut]').forEach(function (arco, indice) {
      var circunferencia = arco.getAttribute('data-circunferencia');
      animar(arco, [
        { strokeDasharray: '0 ' + circunferencia, opacity: .2 },
        { strokeDasharray: arco.getAttribute('data-comprimento') + ' ' + circunferencia, opacity: 1 }
      ], { duration: 850, delay: 180 + indice * 90 });
    });
    raiz.querySelectorAll('[data-barra]').forEach(function (barra, indice) {
      animar(barra, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { delay: 180 + indice * 55 });
    });
    raiz.querySelectorAll('[data-barra-y]').forEach(function (barra, indice) {
      animar(barra, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { delay: 180 + indice * 38 });
    });
    raiz.querySelectorAll('[data-marcador]').forEach(function (marcador, indice) {
      animar(marcador, [{ opacity: 0 }, { opacity: 1 }], { duration: 350, delay: 480 + indice * 35 });
    });
    raiz.querySelectorAll('[data-heatmap]').forEach(function (celula) {
      animar(celula, [{ opacity: 0 }, { opacity: 1 }], { duration: 360, delay: 120 + Number(celula.getAttribute('data-atraso')) });
    });
    raiz.querySelectorAll('[data-bolha], [data-treemap], [data-funil]').forEach(function (item, indice) {
      animar(item, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { delay: 130 + indice * 40 });
    });
    return animacoes;
  }

  window.Graficos = {
    sparkline: sparkline,
    multiLinha: multiLinha,
    linhaArea: linhaArea,
    barrasHorizontais: barrasHorizontais,
    barrasEmpilhadas: barrasEmpilhadas,
    combo: combo,
    donut: donut,
    anel: anel,
    treemap: treemap,
    bolhas: bolhas,
    heatmap: heatmap,
    funil: funil,
    corCrescimento: corCrescimento,
    animarDesenhos: animarDesenhos
  };
})();
