(function () {
  'use strict';

  // Todos os nomes de intervalos, abas e colunas ficam centralizados aqui.
  var BLOCOS = {
    p1_kpis: { aba: 'P1_Visao_Geral', endereco: 'A6:J15' },
    p1_meta: { aba: 'P1_Visao_Geral', endereco: 'A20:D31' },
    p1_tendencia_12m: { aba: 'P1_Visao_Geral', endereco: 'A36:G48' },
    p2_mensal: { aba: 'P2_Evolucao', endereco: 'A6:P18' },
    p2_diario: { aba: 'P2_Evolucao', endereco: 'A23:F113' },
    p3_categorias: { aba: 'P3_Produtos', endereco: 'A6:I14' },
    p3_top10: { aba: 'P3_Produtos', endereco: 'A19:G29' },
    p3_top5_mes: { aba: 'P3_Produtos', endereco: 'A34:G39' },
    p3_produtos: { aba: 'P3_Produtos', endereco: 'A44:L141' },
    p4_estados: { aba: 'P4_Regioes', endereco: 'A6:M33' },
    p4_regioes: { aba: 'P4_Regioes', endereco: 'A38:J43' },
    p5_kpis: { aba: 'P5_Clientes', endereco: 'A6:D13' },
    p5_mensal: { aba: 'P5_Clientes', endereco: 'A18:G30' },
    p5_faixa_etaria: { aba: 'P5_Clientes', endereco: 'A35:E40' },
    p5_genero: { aba: 'P5_Clientes', endereco: 'A45:E48' },
    p5_frequencia: { aba: 'P5_Clientes', endereco: 'A53:E58' },
    p5_canal_aquisicao: { aba: 'P5_Clientes', endereco: 'A63:D70' },
    p6_funil: { aba: 'P6_Marketing', endereco: 'A6:E11' },
    p6_origens: { aba: 'P6_Marketing', endereco: 'A16:J22' },
    p6_receita_origem: { aba: 'P6_Marketing', endereco: 'A27:C34' },
    p6_mensal: { aba: 'P6_Marketing', endereco: 'A39:H51' },
    p7_canais: { aba: 'P7_Habitos', endereco: 'A6:F9' },
    p7_pagamentos: { aba: 'P7_Habitos', endereco: 'A14:F18' },
    p7_heatmap: { aba: 'P7_Habitos', endereco: 'A23:Y30' },
    p7_dia_semana: { aba: 'P7_Habitos', endereco: 'A35:D42' },
    p7_hora: { aba: 'P7_Habitos', endereco: 'A47:B71' },
    p7_canal_mensal: { aba: 'P7_Habitos', endereco: 'A76:F88' },
    p8_kpis: { aba: 'P8_Operacao', endereco: 'A6:F12' },
    p8_em_transporte: { aba: 'P8_Operacao', endereco: 'B14', celula: true },
    p8_status: { aba: 'P8_Operacao', endereco: 'A18:C22' },
    p8_notas: { aba: 'P8_Operacao', endereco: 'A27:C32' },
    p8_prazo_regiao: { aba: 'P8_Operacao', endereco: 'A37:F42' },
    p8_mensal: { aba: 'P8_Operacao', endereco: 'A47:F59' },
    p8_estoque_risco: { aba: 'P8_Operacao', endereco: 'A64:I72' },
    p9_destaques: { aba: 'P9_Destaques', endereco: 'A6:H15' }
  };

  var formatadores = {};
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  function semDado(valor) {
    if (valor === null || valor === undefined || valor === '') return true;
    return typeof valor === 'number' &&
      (!isFinite(valor) || (Number.isInteger(valor) && valor >= -2146826300 && valor <= -2146826000));
  }

  function numero(valor) {
    if (semDado(valor)) return null;
    var convertido = typeof valor === 'number' ? valor : Number(valor);
    return isFinite(convertido) ? convertido : null;
  }

  function texto(valor) {
    return semDado(valor) ? '' : String(valor).trim();
  }

  function dataExcel(valor) {
    var serial = numero(valor);
    if (serial === null) return null;
    var data = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return isNaN(data.getTime()) ? null : data;
  }

  function formatador(chave, opcoes) {
    if (!formatadores[chave]) formatadores[chave] = new Intl.NumberFormat('pt-BR', opcoes);
    return formatadores[chave];
  }

  function decimal(valor, minimas, maximas) {
    var chave = 'd' + minimas + '-' + maximas;
    return formatador(chave, {
      minimumFractionDigits: minimas,
      maximumFractionDigits: maximas
    }).format(valor);
  }

  function moedaDetalhada(valor) {
    return formatador('moeda', {
      style: 'currency', currency: 'BRL',
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(valor);
  }

  function formatar(valor, formato, detalhe) {
    var n = numero(valor);
    if (n === null) return '—';
    var absoluto = Math.abs(n);

    switch (formato) {
      case 'moeda':
        if (detalhe) return moedaDetalhada(n);
        if (absoluto >= 1000000) return 'R$ ' + decimal(n / 1000000, 2, 2) + ' mi';
        if (absoluto >= 1000) return 'R$ ' + decimal(n / 1000, 1, 1) + ' mil';
        return Number.isInteger(n) ? 'R$ ' + decimal(n, 0, 0) : moedaDetalhada(n);
      case 'numero':
        return decimal(n, 0, Number.isInteger(n) ? 0 : 2);
      case 'percentual':
        return decimal(n * 100, 1, 1) + '%';
      case 'nota':
        return decimal(n, 2, 2);
      case 'dias':
        return decimal(n, 1, 1) + ' dias';
      case 'multiplo':
        return decimal(n, 1, 1) + 'x';
      case 'variacao_pct':
        return (n > 0 ? '+' : '') + decimal(n * 100, 1, 1) + '%';
      default:
        return texto(valor) || decimal(n, 0, 2);
    }
  }

  function formatarVariacao(valor, tipo) {
    var n = numero(valor);
    if (n === null) return '—';
    var sinal = n > 0 ? '+' : '';
    if (tipo === 'p.p.') return sinal + decimal(n, 2, 2) + ' p.p.';
    if (tipo === 'pontos') return sinal + decimal(n, 2, 2);
    return sinal + decimal(n * 100, 1, 1) + '%';
  }

  function polaridade(valor, invertida, neutra) {
    var n = numero(valor);
    if (n === null || n === 0 || neutra) return 'neutra';
    var positiva = invertida ? n < 0 : n > 0;
    return positiva ? 'positiva' : 'negativa';
  }

  function seta(valor) {
    var n = numero(valor);
    if (n === null || n === 0) return '•';
    return n > 0 ? '▲' : '▼';
  }

  function formatarData(data) {
    if (!(data instanceof Date) || isNaN(data.getTime())) return '—';
    return String(data.getUTCDate()).padStart(2, '0') + '/' +
      String(data.getUTCMonth() + 1).padStart(2, '0') + '/' + data.getUTCFullYear();
  }

  function paraObjetos(matriz) {
    if (!Array.isArray(matriz) || matriz.length === 0) return [];
    var cabecalho = matriz[0].map(function (nome) { return texto(nome); });
    var linhas = [];

    matriz.slice(1).forEach(function (linha) {
      var objeto = {};
      var temValor = false;
      cabecalho.forEach(function (nome, indice) {
        if (!nome || nome.charAt(0) === '_' || nome.indexOf('chave_rank') === 0) return;
        var valor = linha[indice];
        objeto[nome] = valor;
        if (!semDado(valor)) temValor = true;
      });
      if (temValor) linhas.push(objeto);
    });
    return linhas;
  }

  function porChave(linhas) {
    var indice = {};
    linhas.forEach(function (linha) {
      var chave = texto(linha.chave);
      if (chave) indice[chave] = linha;
    });
    return indice;
  }

  async function lerIntervalo(aba, nome, endereco) {
    try {
      return await bridge.call('readRange', { sheet: aba, address: nome });
    } catch (erroNome) {
      try {
        return await bridge.call('readRange', { sheet: aba, address: endereco });
      } catch (erroEndereco) {
        throw new Error('Não foi possível ler ' + aba + '!' + endereco + ': ' + erroEndereco.message);
      }
    }
  }

  async function lerParametros() {
    var matriz = await bridge.call('readRange', { sheet: 'Parametros', address: 'B5:B20' });
    if (!Array.isArray(matriz) || matriz.length < 16) {
      throw new Error('A área de parâmetros não retornou as células esperadas.');
    }
    function celula(linha) { return matriz[linha][0]; }
    return {
      empresa: texto(celula(0)),
      anoAtual: numero(celula(1)),
      mesReferencia: numero(celula(2)),
      tempoPaginaSeg: numero(celula(3)),
      anoAnterior: numero(celula(4)),
      mesReferenciaNome: texto(celula(13)),
      periodoLabel: texto(celula(14)),
      baseAtualizadaAte: dataExcel(celula(15))
    };
  }

  function normalizarRoteiro(matriz, parametros) {
    return paraObjetos(matriz).map(function (linha) {
      var duracao = numero(linha.duracao_seg);
      if (duracao === null || duracao <= 0) duracao = parametros.tempoPaginaSeg;
      if (duracao === null || duracao <= 0) duracao = 15;
      return {
        numero: Math.trunc(numero(linha.ordem) || 0),
        aba: texto(linha.aba),
        titulo: texto(linha.titulo_pagina),
        pergunta: texto(linha.pergunta_que_responde),
        mensagem: texto(linha.mensagem_chave),
        animacaoEntrada: texto(linha.animacao_entrada),
        transicaoSaida: texto(linha.transicao_saida),
        duracaoSeg: duracao
      };
    }).filter(function (item) {
      return item.numero > 0;
    }).sort(function (a, b) {
      return a.numero - b.numero;
    });
  }

  function normalizarP1(blocos) {
    var linhasKpis = porChave(blocos.p1_kpis);
    var linhasMetas = porChave(blocos.p1_meta);
    var ordem = ['receita', 'pedidos', 'ticket_medio', 'lucro_bruto', 'margem_bruta',
      'unidades', 'novos_clientes', 'taxa_recompra', 'nota_media'];

    var indicadores = ordem.map(function (chave) {
      var linha = linhasKpis[chave] || {};
      return {
        chave: chave,
        titulo: texto(linha.indicador),
        formato: texto(linha.formato),
        tipoVariacao: texto(linha.tipo_variacao),
        atual: numero(linha.acumulado_atual),
        anterior: numero(linha.acumulado_anterior),
        variacao: numero(linha.variacao),
        mesAtual: numero(linha.mes_atual),
        mesAnterior: numero(linha.mes_ano_anterior),
        variacaoMes: numero(linha.variacao_mes)
      };
    });

    function valorMeta(chave) {
      var linha = linhasMetas[chave] || {};
      return numero(linha.valor);
    }

    return {
      indicadores: indicadores,
      metas: {
        anual: {
          meta: valorMeta('meta_anual'),
          realizado: valorMeta('realizado_ano'),
          percentual: valorMeta('pct_meta_anual'),
          falta: valorMeta('falta_meta_anual'),
          diasRestantes: valorMeta('dias_restantes'),
          receitaDiariaNecessaria: valorMeta('receita_diaria_necessaria')
        },
        periodo: {
          meta: valorMeta('meta_periodo'),
          percentual: valorMeta('pct_meta_periodo')
        },
        mes: {
          meta: valorMeta('meta_mes'),
          realizado: valorMeta('realizado_mes'),
          percentual: valorMeta('pct_meta_mes')
        }
      },
      tendencia: blocos.p1_tendencia_12m.map(function (linha) {
        return {
          data: dataExcel(linha.data_ref),
          rotulo: texto(linha.mes_label),
          receita: numero(linha.receita),
          pedidos: numero(linha.pedidos),
          ticket: numero(linha.ticket_medio),
          meta: numero(linha.meta)
        };
      })
    };
  }

  function converter(linha, campos) {
    var convertido = {};
    Object.keys(campos).forEach(function (destino) {
      var regra = campos[destino];
      var origem = Array.isArray(regra) ? regra[0] : regra;
      var tipo = Array.isArray(regra) ? regra[1] : 'numero';
      if (tipo === 'texto') convertido[destino] = texto(linha[origem]);
      else if (tipo === 'data') convertido[destino] = dataExcel(linha[origem]);
      else if (tipo === 'misto') convertido[destino] = semDado(linha[origem]) ? null : linha[origem];
      else convertido[destino] = numero(linha[origem]);
    });
    return convertido;
  }

  function converterLinhas(linhas, campos) {
    return linhas.map(function (linha) { return converter(linha, campos); });
  }

  function normalizarP2(blocos) {
    return {
      mensal: converterLinhas(blocos.p2_mensal, {
        mes: 'mes', rotulo: ['mes_nome', 'texto'], receitaAtual: 'receita_atual',
        receitaAnterior: 'receita_anterior', metaAtual: 'meta_atual',
        receitaAcumAtual: 'receita_acum_atual', receitaAcumAnterior: 'receita_acum_anterior',
        metaAcum: 'meta_acum', pedidosAtual: 'pedidos_atual', pedidosAnterior: 'pedidos_anterior',
        ticketAtual: 'ticket_atual', ticketAnterior: 'ticket_anterior',
        margemAtual: 'margem_atual', crescimento: 'crescimento_yoy'
      }),
      diario: converterLinhas(blocos.p2_diario, {
        data: ['data', 'data'], diaSemana: ['dia_semana', 'texto'], receita: 'receita',
        pedidos: 'pedidos', mediaMovel: 'media_movel_7d', receitaAnterior: 'receita_mesmo_dia_ano_anterior'
      })
    };
  }

  function normalizarP3(blocos) {
    return {
      categorias: converterLinhas(blocos.p3_categorias, {
        categoria: ['categoria', 'texto'], receitaAtual: 'receita_atual',
        receitaAnterior: 'receita_anterior', crescimento: 'crescimento',
        participacao: 'participacao', lucro: 'lucro_bruto', margem: 'margem',
        unidades: 'unidades', receitaMes: 'receita_mes_ref'
      }),
      top10: converterLinhas(blocos.p3_top10, {
        posicao: 'posicao', produto: ['produto', 'texto'], categoria: ['categoria', 'texto'],
        receita: 'receita', unidades: 'unidades', margem: 'margem'
      }),
      top5: converterLinhas(blocos.p3_top5_mes, {
        posicao: 'posicao', produto: ['produto', 'texto'], categoria: ['categoria', 'texto'],
        receita: 'receita', unidades: 'unidades'
      })
    };
  }

  function normalizarP4(blocos) {
    return {
      estados: converterLinhas(blocos.p4_estados, {
        uf: ['uf', 'texto'], estado: ['estado', 'texto'], regiao: ['regiao', 'texto'],
        latitude: 'latitude', longitude: 'longitude', receitaAtual: 'receita_atual',
        receitaAnterior: 'receita_anterior', crescimento: 'crescimento',
        participacao: 'participacao', pedidos: 'pedidos_atual',
        ticket: 'ticket_medio', prazo: 'prazo_medio_dias'
      }),
      regioes: converterLinhas(blocos.p4_regioes, {
        regiao: ['regiao', 'texto'], receitaAtual: 'receita_atual',
        receitaAnterior: 'receita_anterior', crescimento: 'crescimento',
        participacao: 'participacao', pedidos: 'pedidos', ticket: 'ticket_medio',
        prazoAtual: 'prazo_medio_atual', prazoAnterior: 'prazo_medio_anterior',
        pctNoPrazo: 'pct_no_prazo'
      })
    };
  }

  function normalizarP5(blocos) {
    var kpis = porChave(blocos.p5_kpis);
    var nomes = {
      baseClientes: 'base_clientes', novosClientes: 'novos_clientes',
      ticketNovos: 'ticket_novos', ticketRecorrentes: 'ticket_recorrentes',
      receitaRecorrentes: 'pct_receita_recorrentes', pedidosPorCliente: 'pedidos_por_cliente',
      ltvMedio: 'ltv_medio'
    };
    var indicadores = {};
    Object.keys(nomes).forEach(function (destino) {
      var linha = kpis[nomes[destino]] || {};
      indicadores[destino] = {
        titulo: texto(linha.indicador), valor: numero(linha.valor), formato: texto(linha.formato)
      };
    });
    return {
      indicadores: indicadores,
      mensal: converterLinhas(blocos.p5_mensal, {
        mes: 'mes', rotulo: ['mes_nome', 'texto'], pedidosNovos: 'pedidos_novos',
        pedidosRecorrentes: 'pedidos_recorrentes', receitaNovos: 'receita_novos',
        receitaRecorrentes: 'receita_recorrentes', pctRecorrentes: 'pct_recorrentes'
      }),
      faixas: converterLinhas(blocos.p5_faixa_etaria, {
        segmento: ['segmento', 'texto'], pedidos: 'pedidos', receita: 'receita',
        ticket: 'ticket_medio', participacao: 'participacao'
      }),
      generos: converterLinhas(blocos.p5_genero, {
        segmento: ['segmento', 'texto'], pedidos: 'pedidos', receita: 'receita',
        ticket: 'ticket_medio', participacao: 'participacao'
      }),
      frequencias: converterLinhas(blocos.p5_frequencia, {
        faixa: ['faixa', 'texto'], minimo: 'min_pedidos', maximo: 'max_pedidos',
        clientes: 'clientes', participacao: 'pct_clientes'
      }),
      canais: converterLinhas(blocos.p5_canal_aquisicao, {
        canal: ['canal', 'texto'], clientes: 'clientes_adquiridos_periodo',
        ltv: 'ltv_medio', pedidosPorCliente: 'pedidos_por_cliente'
      })
    };
  }

  function normalizarP6(blocos) {
    return {
      funil: converterLinhas(blocos.p6_funil, {
        etapa: ['etapa', 'texto'], chave: ['chave', 'texto'], valor: 'valor',
        pctTopo: 'pct_do_topo', conversao: 'conversao_etapa'
      }),
      origens: converterLinhas(blocos.p6_origens, {
        origem: ['origem', 'texto'], investimento: 'investimento', sessoes: 'sessoes',
        pedidos: 'pedidos', novosClientes: 'novos_clientes', receita: 'receita',
        conversao: 'taxa_conversao', roas: 'roas', cac: 'cac',
        participacao: 'participacao_receita_total'
      }),
      receitaOrigens: converterLinhas(blocos.p6_receita_origem, {
        origem: ['origem', 'texto'], receita: 'receita', participacao: 'participacao'
      }),
      mensal: converterLinhas(blocos.p6_mensal, {
        mes: 'mes', rotulo: ['mes_nome', 'texto'], investimento: 'investimento_total',
        investimentoPago: 'investimento_midia_paga', receitaPaga: 'receita_midia_paga',
        roasPago: 'roas_midia_paga', sessoes: 'sessoes', conversao: 'taxa_conversao'
      })
    };
  }

  function normalizarP7(blocos) {
    return {
      canais: converterLinhas(blocos.p7_canais, {
        canal: ['canal', 'texto'], pedidos: 'pedidos_atual', receita: 'receita_atual',
        ticket: 'ticket_medio', participacao: 'participacao_atual', anterior: 'participacao_anterior'
      }),
      pagamentos: converterLinhas(blocos.p7_pagamentos, {
        forma: ['forma_pagamento', 'texto'], pedidos: 'pedidos_atual', receita: 'receita_atual',
        participacao: 'participacao_atual', anterior: 'participacao_anterior', parcelas: 'parcelas_medias'
      }),
      heatmap: blocos.p7_heatmap.map(function (linha) {
        var horas = [];
        for (let hora = 0; hora < 24; hora++) {
          horas.push(numero(linha['h' + String(hora).padStart(2, '0')]));
        }
        return { dia: texto(linha.dia_semana), horas: horas };
      }),
      dias: converterLinhas(blocos.p7_dia_semana, {
        dia: ['dia_semana', 'texto'], pedidos: 'pedidos', receita: 'receita', ticket: 'ticket_medio'
      }),
      horas: converterLinhas(blocos.p7_hora, { hora: 'hora', pedidos: 'pedidos' }),
      mensal: converterLinhas(blocos.p7_canal_mensal, {
        mes: 'mes', rotulo: ['mes_nome', 'texto'], site: 'site', app: 'app',
        marketplace: 'marketplace', pctApp: 'pct_app'
      })
    };
  }

  function normalizarP8(blocos) {
    var kpis = porChave(blocos.p8_kpis);
    var nomes = {
      prazoMedio: 'prazo_medio', pctNoPrazo: 'pct_no_prazo',
      cancelamento: 'taxa_cancelamento', devolucao: 'taxa_devolucao',
      notaMedia: 'nota_media', pctNota5: 'pct_nota_5'
    };
    var indicadores = {};
    Object.keys(nomes).forEach(function (destino) {
      var linha = kpis[nomes[destino]] || {};
      indicadores[destino] = {
        titulo: texto(linha.indicador), formato: texto(linha.formato),
        atual: numero(linha.atual), anterior: numero(linha.anterior),
        variacao: numero(linha.variacao),
        invertida: destino === 'prazoMedio' || destino === 'cancelamento' || destino === 'devolucao',
        neutra: destino === 'notaMedia' || destino === 'pctNota5'
      };
    });
    return {
      indicadores: indicadores,
      emTransporte: numero(blocos.p8_em_transporte),
      status: converterLinhas(blocos.p8_status, {
        status: ['status', 'texto'], pedidos: 'pedidos', participacao: 'participacao'
      }),
      notas: converterLinhas(blocos.p8_notas, {
        nota: 'nota', avaliacoes: 'avaliacoes', participacao: 'participacao'
      }),
      prazos: converterLinhas(blocos.p8_prazo_regiao, {
        regiao: ['regiao', 'texto'], prometido: 'prazo_prometido_medio',
        atual: 'prazo_real_atual', anterior: 'prazo_real_anterior',
        pctAtual: 'pct_no_prazo_atual', pctAnterior: 'pct_no_prazo_anterior'
      }),
      mensal: converterLinhas(blocos.p8_mensal, {
        mes: 'mes', rotulo: ['mes_nome', 'texto'], prazo: 'prazo_medio',
        pctNoPrazo: 'pct_no_prazo', nota: 'nota_media', cancelamento: 'taxa_cancelamento'
      }),
      estoque: converterLinhas(blocos.p8_estoque_risco, {
        posicao: 'posicao', produto: ['produto', 'texto'], categoria: ['categoria', 'texto'],
        atual: 'estoque_atual', minimo: 'estoque_minimo', vendas30d: 'vendas_30d',
        cobertura: 'cobertura_dias', status: ['status_estoque', 'texto']
      })
    };
  }

  function normalizarP9(blocos) {
    var linhas = porChave(blocos.p9_destaques);
    var ordem = ['faturamento_mes', 'meta_mes', 'melhor_dia', 'produto_destaque',
      'categoria_crescimento', 'estado_crescimento', 'melhor_roas', 'satisfacao_mes',
      'novos_clientes_mes'];
    return ordem.map(function (chave) {
      var linha = linhas[chave] || {};
      return {
        chave: chave, titulo: texto(linha.titulo), nome: texto(linha.nome),
        valor: semDado(linha.valor) ? null : linha.valor,
        formatoValor: texto(linha.formato_valor),
        comparacao: semDado(linha.comparacao) ? null : linha.comparacao,
        formatoComparacao: texto(linha.formato_comparacao),
        legenda: texto(linha.legenda_comparacao)
      };
    });
  }

  function formatarMisto(valor, formato) {
    if (semDado(valor)) return '—';
    if (typeof valor !== 'number') return texto(valor);
    if (formato === 'data') return formatarData(dataExcel(valor));
    return formatar(valor, formato);
  }

  function formatarDelta(valor, formato) {
    var n = numero(valor);
    if (n === null) return '—';
    var sinal = n > 0 ? '+' : '';
    if (formato === 'percentual') return sinal + decimal(n, 2, 2) + ' p.p.';
    if (formato === 'dias') return sinal + decimal(n, 1, 1) + (Math.abs(n) === 1 ? ' dia' : ' dias');
    if (formato === 'nota') return sinal + decimal(n, 2, 2);
    return sinal + formatar(n, formato);
  }

  async function alterarMes(mes) {
    try {
      return await bridge.call('writeCell', { sheet: 'Parametros', address: 'mes_ref', value: mes });
    } catch (erroNome) {
      return bridge.call('writeCell', { sheet: 'Parametros', address: 'B7', value: mes });
    }
  }

  async function carregarTudo(aoReceberParametros) {
    var parametros = await lerParametros();
    if (typeof aoReceberParametros === 'function') aoReceberParametros(parametros);

    var roteiroMatriz = await bridge.call('readRange', {
      sheet: 'Roteiro_Dashboard', address: 'A4:J13'
    });
    var nomes = Object.keys(BLOCOS);
    var matrizes = await Promise.all(nomes.map(function (nome) {
      var bloco = BLOCOS[nome];
      return lerIntervalo(bloco.aba, nome, bloco.endereco);
    }));

    var blocos = {};
    nomes.forEach(function (nome, indice) {
      blocos[nome] = BLOCOS[nome].celula
        ? (matrizes[indice][0] ? matrizes[indice][0][0] : null)
        : paraObjetos(matrizes[indice]);
    });

    var roteiro = normalizarRoteiro(roteiroMatriz, parametros);
    if (!roteiro.length) throw new Error('O roteiro do dashboard está vazio.');

    return {
      parametros: parametros,
      roteiro: roteiro,
      paginas: {
        1: normalizarP1(blocos),
        2: normalizarP2(blocos),
        3: normalizarP3(blocos),
        4: normalizarP4(blocos),
        5: normalizarP5(blocos),
        6: normalizarP6(blocos),
        7: normalizarP7(blocos),
        8: normalizarP8(blocos),
        9: normalizarP9(blocos)
      }
    };
  }

  function nomeMes(mes) {
    return MESES[Math.max(0, Math.min(11, (mes || 1) - 1))];
  }

  window.Dados = {
    carregarTudo: carregarTudo,
    alterarMes: alterarMes,
    semDado: semDado,
    numero: numero,
    dataExcel: dataExcel,
    formatar: formatar,
    formatarMisto: formatarMisto,
    formatarDelta: formatarDelta,
    formatarVariacao: formatarVariacao,
    formatarData: formatarData,
    polaridade: polaridade,
    seta: seta,
    nomeMes: nomeMes
  };
})();
