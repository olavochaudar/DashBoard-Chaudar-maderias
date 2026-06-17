import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './Hero.css';
import { supabase } from '../lib/supabaseClient';

const TIPOS_MADEIRA = ['Pinus', 'Eucalipto', 'Ipê', 'Cedro', 'Itaúba', 'Outra'];

// Converte string com vírgula/ponto em número, tratando corretamente o formato brasileiro
const paraNumero = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return NaN;
  let str = valor.toString().trim();
  const temVirgula = str.includes(',');
  const temPonto = str.includes('.');
  if (temVirgula && temPonto) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (temVirgula) {
    str = str.replace(',', '.');
  } else if (temPonto) {
    const partes = str.split('.');
    const ultimaParte = partes[partes.length - 1];
    if (partes.length > 1 && ultimaParte.length === 3 && partes.every(p => /^\d+$/.test(p))) {
      str = str.replace(/\./g, '');
    }
  }
  return parseFloat(str);
};

const mapearRomaneio = (r) => {
  const quantidade = Number(r.quantidade) || 0;
  const valorMadeira = Number(r.valor_madeira) || 0;
  const valorFrete = Number(r.valor_frete) || 0;
  const comissaoPorM3 = Number(r.comissao_por_m3) || 0;
  const comissaoValor = comissaoPorM3 * quantidade;
  const valorTotal = valorMadeira + valorFrete;
  const liquido = valorMadeira - comissaoValor;

  return {
    id: r.id,
    data: r.data,
    romaneio: r.romaneio,
    fornecedor: r.fornecedor,
    madeira: r.madeira,
    quantidade,
    valorMadeira,
    valorFrete,
    comissaoPorM3,
    comissaoValor,
    valorTotal,
    liquido,
    placa: r.placa,
    cliente: r.cliente
  };
};

const Hero = () => {
  const [registros, setRegistros] = useState([]);
  const [form, setForm] = useState({
    data: '',
    romaneio: '',
    fornecedor: '',
    madeira: '',
    quantidade: '',
    valorMadeira: '',
    valorFrete: '',
    comissaoPorM3: '',
    placa: '',
    cliente: ''
  });
  const [busca, setBusca] = useState('');
  const [filtroMadeira, setFiltroMadeira] = useState('todas');
  const [filtroFornecedor, setFiltroFornecedor] = useState('todos');
  const [ordenacao, setOrdenacao] = useState('recente');
  const [erroBanco, setErroBanco] = useState(null);

  const carregarRegistros = useCallback(async () => {
    const { data, error } = await supabase
      .from('romaneios')
      .select('*')
      .order('data', { ascending: false });

    if (error) {
      console.error(error);
      setErroBanco(error.message);
      return;
    }

    setErroBanco(null);
    setRegistros((data ?? []).map(mapearRomaneio));
  }, []);

  useEffect(() => {
    carregarRegistros();
  }, [carregarRegistros]);

  const CAMPOS_NUMERICOS = ['quantidade', 'valorMadeira', 'valorFrete', 'comissaoPorM3'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (CAMPOS_NUMERICOS.includes(name)) {
      if (value === '' || /^[0-9.,]*$/.test(value)) {
        setForm({ ...form, [name]: value });
      }
      return;
    }
    setForm({ ...form, [name]: value });
  };

  // Cálculo em tempo real para pré-visualização no formulário
  const previewQuantidade = paraNumero(form.quantidade) || 0;
  const previewValorMadeira = paraNumero(form.valorMadeira) || 0;
  const previewValorFrete = paraNumero(form.valorFrete) || 0;
  const previewComissaoPorM3 = paraNumero(form.comissaoPorM3) || 0;

  // Comissão total = valor por m³ multiplicado pela quantidade de m³
  const previewComissaoValor = previewComissaoPorM3 * previewQuantidade;

  // Valor Total soma madeira + frete UMA ÚNICA VEZ
  const previewValorTotal = previewValorMadeira + previewValorFrete;
  const previewLiquido = previewValorMadeira - previewComissaoValor;
  const comissaoInvalida = previewComissaoValor > previewValorMadeira || previewLiquido < 0;

  const addRegistro = async (e) => {
    e.preventDefault();
    const quantidadeNumerica = paraNumero(form.quantidade);
    const valorMadeira = paraNumero(form.valorMadeira);
    const valorFrete = paraNumero(form.valorFrete);
    const comissaoPorM3 = paraNumero(form.comissaoPorM3);

    if (
      !form.data ||
      !form.romaneio.trim() ||
      !form.fornecedor.trim() ||
      !form.madeira.trim() ||
      !form.placa.trim() ||
      !form.cliente.trim() ||
      isNaN(quantidadeNumerica) || quantidadeNumerica <= 0 ||
      isNaN(valorMadeira) || valorMadeira <= 0 ||
      isNaN(valorFrete) || valorFrete < 0 ||
      isNaN(comissaoPorM3) || comissaoPorM3 < 0
    ) {
      return;
    }

    const comissaoValor = comissaoPorM3 * quantidadeNumerica;

    if (comissaoValor > valorMadeira) return;

    const { error } = await supabase
      .from('romaneios')
      .insert([
        {
          data: form.data,
          romaneio: form.romaneio.trim(),
          fornecedor: form.fornecedor.trim(),
          madeira: form.madeira.trim(),
          quantidade: quantidadeNumerica,
          valor_madeira: valorMadeira,
          valor_frete: valorFrete,
          comissao_por_m3: comissaoPorM3,
          placa: form.placa.trim().toUpperCase(),
          cliente: form.cliente.trim()
        }
      ]);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    await carregarRegistros();

    setForm({
      data: '',
      romaneio: '',
      fornecedor: '',
      madeira: '',
      quantidade: '',
      valorMadeira: '',
      valorFrete: '',
      comissaoPorM3: '',
      placa: '',
      cliente: ''
    });
  };

  const deletar = async (id) => {
    const { error } = await supabase
      .from('romaneios')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    await carregarRegistros();
  };

  const madeirasCadastradas = useMemo(() => {
    const unicas = [...new Set(registros.map(r => r.madeira))];
    return unicas.sort();
  }, [registros]);

  const fornecedoresCadastrados = useMemo(() => {
    const unicos = [...new Set(registros.map(r => r.fornecedor))];
    return unicos.sort();
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    let lista = [...registros];

    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      lista = lista.filter(r =>
        r.romaneio.toLowerCase().includes(termo) ||
        r.placa.toLowerCase().includes(termo) ||
        r.cliente.toLowerCase().includes(termo) ||
        r.madeira.toLowerCase().includes(termo) ||
        r.fornecedor.toLowerCase().includes(termo)
      );
    }

    if (filtroMadeira !== 'todas') {
      lista = lista.filter(r => r.madeira === filtroMadeira);
    }

    if (filtroFornecedor !== 'todos') {
      lista = lista.filter(r => r.fornecedor === filtroFornecedor);
    }

    lista.sort((a, b) => {
      if (ordenacao === 'recente') return new Date(b.data) - new Date(a.data);
      if (ordenacao === 'antigo') return new Date(a.data) - new Date(b.data);
      if (ordenacao === 'maior') return b.valorTotal - a.valorTotal;
      if (ordenacao === 'menor') return a.valorTotal - b.valorTotal;
      if (ordenacao === 'volume') return b.quantidade - a.quantidade;
      if (ordenacao === 'comissao') return b.comissaoValor - a.comissaoValor;
      return 0;
    });

    return lista;
  }, [registros, busca, filtroMadeira, filtroFornecedor, ordenacao]);

  // ESTATÍSTICAS GERAIS — cada valor é somado uma única vez a partir dos registros
  const stats = useMemo(() => {
    const totalMadeira = registros.reduce((a, r) => a + r.valorMadeira, 0);
    const totalFrete = registros.reduce((a, r) => a + r.valorFrete, 0);
    const totalComissao = registros.reduce((a, r) => a + r.comissaoValor, 0);
    const totalGeral = totalMadeira + totalFrete;
    const totalLiquido = totalMadeira - totalComissao;
    const totalM3 = registros.reduce((a, r) => a + r.quantidade, 0);
    const totalRomaneios = registros.length;
    const precoMedioM3 = totalM3 > 0 ? totalMadeira / totalM3 : 0;
    const comissaoMediaM3 = totalM3 > 0 ? totalComissao / totalM3 : 0;
    const placasUnicas = new Set(registros.map(r => r.placa)).size;
    const fornecedoresUnicos = new Set(registros.map(r => r.fornecedor)).size;

    return { totalMadeira, totalFrete, totalComissao, totalGeral, totalLiquido, totalM3, totalRomaneios, precoMedioM3, comissaoMediaM3, placasUnicas, fornecedoresUnicos };
  }, [registros]);

  const rankingMadeiras = useMemo(() => {
    const mapa = {};
    registros.forEach(r => {
      if (!mapa[r.madeira]) mapa[r.madeira] = { quantidade: 0, valorMadeira: 0 };
      mapa[r.madeira].quantidade += r.quantidade;
      mapa[r.madeira].valorMadeira += r.valorMadeira;
    });
    return Object.entries(mapa)
      .map(([madeira, dados]) => ({ madeira, ...dados }))
      .sort((a, b) => b.valorMadeira - a.valorMadeira);
  }, [registros]);

  const rankingFornecedores = useMemo(() => {
    const mapa = {};
    registros.forEach(r => {
      if (!mapa[r.fornecedor]) mapa[r.fornecedor] = { quantidade: 0, valorMadeira: 0, romaneios: 0 };
      mapa[r.fornecedor].quantidade += r.quantidade;
      mapa[r.fornecedor].valorMadeira += r.valorMadeira;
      mapa[r.fornecedor].romaneios += 1;
    });
    return Object.entries(mapa)
      .map(([fornecedor, dados]) => ({ fornecedor, ...dados }))
      .sort((a, b) => b.valorMadeira - a.valorMadeira);
  }, [registros]);

  const maiorValorMadeira = rankingMadeiras[0]?.valorMadeira || 1;
  const maiorValorFornecedor = rankingFornecedores[0]?.valorMadeira || 1;

  const formatarMoeda = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 'R$ 0,00';
    return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const formatarM3 = (v) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³`;
  const formatarData = (d) => {
    const [ano, mes, dia] = d.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <main className='dash-container'>
      <header className='dash-header'>
        <h1>Painel de Romaneios - Madeireira</h1>
        <p>Controle de cargas, fornecedores, valores de madeira, frete e comissões</p>
        {erroBanco && (
          <p className='form-warning'>Erro ao conectar com o banco: {erroBanco}</p>
        )}
      </header>

      <section className='stats-grid'>
        <div className='stat-card highlight'>
          <span className='stat-label'>Valor Total (Madeira + Frete)</span>
          <span className='stat-value'>{formatarMoeda(stats.totalGeral)}</span>
        </div>
        <div className='stat-card'>
          <span className='stat-label'>Total Madeira</span>
          <span className='stat-value'>{formatarMoeda(stats.totalMadeira)}</span>
        </div>
        <div className='stat-card'>
          <span className='stat-label'>Total Frete</span>
          <span className='stat-value'>{formatarMoeda(stats.totalFrete)}</span>
        </div>
        <div className='stat-card warning'>
          <span className='stat-label'>Total Comissões</span>
          <span className='stat-value'>{formatarMoeda(stats.totalComissao)}</span>
        </div>
        <div className='stat-card success'>
          <span className='stat-label'>Líquido (Madeira - Comissão)</span>
          <span className='stat-value'>{formatarMoeda(stats.totalLiquido)}</span>
        </div>
        <div className='stat-card'>
          <span className='stat-label'>Volume Total</span>
          <span className='stat-value'>{formatarM3(stats.totalM3)}</span>
        </div>
        <div className='stat-card'>
          <span className='stat-label'>Preço Médio Madeira/m³</span>
          <span className='stat-value'>{formatarMoeda(stats.precoMedioM3)}</span>
        </div>
        <div className='stat-card'>
          <span className='stat-label'>Romaneios / Caminhões / Fornecedores</span>
          <span className='stat-value'>{stats.totalRomaneios} / {stats.placasUnicas} / {stats.fornecedoresUnicos}</span>
        </div>
      </section>

      <div className='dash-grid'>
        <section className='panel form-panel'>
          <h2>Novo Romaneio</h2>
          <form onSubmit={addRegistro}>
            <label>
              Data de Entrega
              <input type="date" name="data" value={form.data} onChange={handleChange} required />
            </label>
            <label>
              Número do Romaneio
              <input type="text" name="romaneio" placeholder="Ex: 001/Abril" value={form.romaneio} onChange={handleChange} required />
            </label>
            <label>
              Fornecedor
              <input
                type="text"
                name="fornecedor"
                placeholder="Ex: José da Silva"
                value={form.fornecedor}
                onChange={handleChange}
                list="lista-fornecedores"
                required
              />
              <datalist id="lista-fornecedores">
                {fornecedoresCadastrados.map(f => <option key={f} value={f} />)}
              </datalist>
            </label>
            <label>
              Madeira
              <input
                type="text"
                name="madeira"
                placeholder="Ex: Pinus"
                value={form.madeira}
                onChange={handleChange}
                list="lista-madeiras"
                required
              />
              <datalist id="lista-madeiras">
                {TIPOS_MADEIRA.map(m => <option key={m} value={m} />)}
              </datalist>
            </label>
            <label>
              Quantidade (m³)
              <input
                type="text"
                inputMode="decimal"
                name="quantidade"
                placeholder="0,000"
                value={form.quantidade}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Valor Madeira (R$)
              <input
                type="text"
                inputMode="decimal"
                name="valorMadeira"
                placeholder="0,00"
                value={form.valorMadeira}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Valor Frete (R$)
              <input
                type="text"
                inputMode="decimal"
                name="valorFrete"
                placeholder="0,00"
                value={form.valorFrete}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Comissão Vendedor (R$ por m³)
              <input
                type="text"
                inputMode="decimal"
                name="comissaoPorM3"
                placeholder="Ex: 30,00"
                value={form.comissaoPorM3}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Placa do Caminhão
              <input type="text" name="placa" placeholder="Ex: ABC1D23" value={form.placa} onChange={handleChange} required />
            </label>
            <label>
              Cliente / Cidade
              <input type="text" name="cliente" placeholder="Ex: João Silva - Itapeva" value={form.cliente} onChange={handleChange} required />
            </label>

            <div className='preview-box'>
              <div><span>Valor Total (Madeira + Frete):</span><strong>{formatarMoeda(previewValorTotal)}</strong></div>
              <div><span>Comissão ({form.comissaoPorM3 || 0} x {previewQuantidade.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³):</span><strong>{formatarMoeda(previewComissaoValor)}</strong></div>
              <div><span>Líquido p/ Madeireira:</span><strong>{formatarMoeda(previewLiquido)}</strong></div>
            </div>

            {comissaoInvalida && (
              <p className='form-warning'>
                ⚠️ A comissão total (R$/m³ × quantidade) não pode ser maior que o valor da madeira. Verifique os valores antes de cadastrar.
              </p>
            )}

            <button type="submit" disabled={comissaoInvalida}>Cadastrar Romaneio</button>
          </form>
        </section>

        <section className='panel ranking-panel'>
          <h2>Faturamento de Madeira por Tipo</h2>
          {rankingMadeiras.length === 0 && <p className='empty-msg'>Sem dados ainda.</p>}
          {rankingMadeiras.map(({ madeira, valorMadeira, quantidade }) => (
            <div className='ranking-item' key={madeira}>
              <div className='ranking-info'>
                <span>{madeira} <small>({formatarM3(quantidade)})</small></span>
                <strong>{formatarMoeda(valorMadeira)}</strong>
              </div>
              <div className='ranking-bar-bg'>
                <div className='ranking-bar' style={{ width: `${(valorMadeira / maiorValorMadeira) * 100}%` }} />
              </div>
            </div>
          ))}

          <h2 className='secondary-title'>Fornecedores</h2>
          {rankingFornecedores.length === 0 && <p className='empty-msg'>Sem dados ainda.</p>}
          {rankingFornecedores.map(({ fornecedor, valorMadeira, quantidade, romaneios }) => (
            <div className='ranking-item' key={fornecedor}>
              <div className='ranking-info'>
                <span>{fornecedor} <small>({formatarM3(quantidade)} - {romaneios} romaneio{romaneios > 1 ? 's' : ''})</small></span>
                <strong>{formatarMoeda(valorMadeira)}</strong>
              </div>
              <div className='ranking-bar-bg'>
                <div className='ranking-bar fornecedor' style={{ width: `${(valorMadeira / maiorValorFornecedor) * 100}%` }} />
              </div>
            </div>
          ))}

          <h2 className='secondary-title'>Resumo Financeiro</h2>
          <div className='resumo-financeiro'>
            <div className='resumo-item'>
              <span>Madeira</span>
              <strong>{formatarMoeda(stats.totalMadeira)}</strong>
            </div>
            <div className='resumo-item'>
              <span>Frete</span>
              <strong>{formatarMoeda(stats.totalFrete)}</strong>
            </div>
            <div className='resumo-item negativo'>
              <span>Comissões ({stats.comissaoMediaM3.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/m³ médio)</span>
              <strong>- {formatarMoeda(stats.totalComissao)}</strong>
            </div>
            <div className='resumo-item total'>
              <span>Líquido Madeireira</span>
              <strong>{formatarMoeda(stats.totalLiquido)}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className='panel table-panel'>
        <div className='table-header'>
          <h2>Romaneios Registrados</h2>
          <div className='table-filters'>
            <input
              type="text"
              placeholder="Buscar por romaneio, placa, cliente, fornecedor ou madeira..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <select value={filtroFornecedor} onChange={(e) => setFiltroFornecedor(e.target.value)}>
              <option value="todos">Todos os fornecedores</option>
              {fornecedoresCadastrados.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={filtroMadeira} onChange={(e) => setFiltroMadeira(e.target.value)}>
              <option value="todas">Todas as madeiras</option>
              {madeirasCadastradas.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)}>
              <option value="recente">Mais recente</option>
              <option value="antigo">Mais antigo</option>
              <option value="maior">Maior valor total</option>
              <option value="menor">Menor valor total</option>
              <option value="volume">Maior volume (m³)</option>
              <option value="comissao">Maior comissão</option>
            </select>
          </div>
        </div>

        <div className='table-wrapper'>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Romaneio</th>
                <th>Fornecedor</th>
                <th>Madeira</th>
                <th>Quantit. m³</th>
                <th>Valor Madeira</th>
                <th>Valor Frete</th>
                <th>Valor Total</th>
                <th>Comissão (R$/m³)</th>
                <th>Comissão Total</th>
                <th>Líquido</th>
                <th>Placa</th>
                <th>Cliente/Cidade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.length === 0 && (
                <tr><td colSpan="14" className='empty-msg'>Nenhum registro encontrado.</td></tr>
              )}
              {registrosFiltrados.map(r => (
                <tr key={r.id}>
                  <td>{formatarData(r.data)}</td>
                  <td>{r.romaneio}</td>
                  <td><span className='fornecedor-badge'>{r.fornecedor}</span></td>
                  <td><span className='madeira-badge'>{r.madeira}</span></td>
                  <td>{formatarM3(r.quantidade)}</td>
                  <td>{formatarMoeda(r.valorMadeira)}</td>
                  <td>{formatarMoeda(r.valorFrete)}</td>
                  <td className='valor-cell'>{formatarMoeda(r.valorTotal)}</td>
                  <td>{formatarMoeda(r.comissaoPorM3)}</td>
                  <td className='comissao-cell'>{formatarMoeda(r.comissaoValor)}</td>
                  <td className='liquido-cell'>{formatarMoeda(r.liquido)}</td>
                  <td><span className='placa-badge'>{r.placa}</span></td>
                  <td>{r.cliente}</td>
                  <td>
                    <button className='del-btn' onClick={() => deletar(r.id)} title="Excluir">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
            {registrosFiltrados.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan="4"><strong>Totais (filtro atual)</strong></td>
                  <td><strong>{formatarM3(registrosFiltrados.reduce((a, r) => a + r.quantidade, 0))}</strong></td>
                  <td><strong>{formatarMoeda(registrosFiltrados.reduce((a, r) => a + r.valorMadeira, 0))}</strong></td>
                  <td><strong>{formatarMoeda(registrosFiltrados.reduce((a, r) => a + r.valorFrete, 0))}</strong></td>
                  <td><strong>{formatarMoeda(registrosFiltrados.reduce((a, r) => a + r.valorTotal, 0))}</strong></td>
                  <td></td>
                  <td><strong>{formatarMoeda(registrosFiltrados.reduce((a, r) => a + r.comissaoValor, 0))}</strong></td>
                  <td><strong>{formatarMoeda(
                    registrosFiltrados.reduce((a, r) => a + r.valorMadeira, 0) -
                    registrosFiltrados.reduce((a, r) => a + r.comissaoValor, 0)
                  )}</strong></td>
                  <td colSpan="3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </main>
  );
};

export default Hero;