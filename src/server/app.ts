import express, {
  type Express,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import path from 'path';
import type { Repositorio } from './repository';
import { ErroAcessoRestrito, semAutenticacao, type VerificadorToken } from './auth';

const TIPOS_GABINETE = ['vereador', 'lideranca', 'presidencia', 'secretaria'];

function gerarId(prefixo: string): string {
  return prefixo + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Express 4 não intercepta promises rejeitadas: encaminha o erro ao middleware final. */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function criarApp(repositorio: Repositorio, verificadorToken: VerificadorToken = semAutenticacao): Express {
  const app = express();
  app.use(express.json());

  app.use('/api', async (req, res, next) => {
    // Dev: semAutenticacao preserva o contrato sem exigir token.
    if (verificadorToken === semAutenticacao) {
      return next();
    }

    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ erro: 'Não autenticado.' });
    }

    const token = authorization.slice('Bearer '.length);
    try {
      const usuario = await verificadorToken(token);
      (req as any).usuario = usuario;
      return next();
    } catch (erro) {
      if (erro instanceof ErroAcessoRestrito) {
        return res.status(403).json({ erro: 'Acesso restrito.' });
      }
      return res.status(401).json({ erro: 'Não autenticado.' });
    }
  });

  // ---------- Gabinetes ----------
  app.get('/api/gabinetes', asyncHandler(async (_req, res) => {
    res.json(await repositorio.listar('gabinetes'));
  }));

  app.post('/api/gabinetes', asyncHandler(async (req, res) => {
    const dados = req.body;
    if (!dados?.nome) {
      return res.status(400).json({ erro: 'Nome do gabinete é obrigatório.' });
    }
    const novo = {
      id: gerarId('gab_'),
      ...dados,
      ativo: dados.ativo ?? true,
    };
    await repositorio.salvar('gabinetes', novo);
    res.status(201).json(novo);
  }));

  app.put('/api/gabinetes/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const dados = req.body ?? {};
    const atual = await repositorio.buscar<any>('gabinetes', id);
    if (!atual) {
      return res.status(404).json({ erro: 'Gabinete não encontrado.' });
    }
    const atualizacoes: Record<string, unknown> = {};
    if (dados.nome !== undefined) {
      if (typeof dados.nome !== 'string' || !dados.nome.trim()) {
        return res.status(400).json({ erro: 'Nome do gabinete é obrigatório.' });
      }
      atualizacoes.nome = dados.nome.trim();
    }
    if (dados.tipo !== undefined) {
      if (typeof dados.tipo !== 'string' || !TIPOS_GABINETE.includes(dados.tipo)) {
        return res.status(400).json({ erro: 'Tipo de gabinete inválido.' });
      }
      atualizacoes.tipo = dados.tipo;
    }
    if (dados.vereadorResponsavel !== undefined) {
      if (typeof dados.vereadorResponsavel !== 'string') {
        return res.status(400).json({ erro: 'Responsável inválido.' });
      }
      atualizacoes.vereadorResponsavel = dados.vereadorResponsavel.trim();
    }
    if (dados.ativo !== undefined) {
      if (typeof dados.ativo !== 'boolean') {
        return res.status(400).json({ erro: 'Situação inválida.' });
      }
      atualizacoes.ativo = dados.ativo;
    }
    const atualizado = { ...atual, ...atualizacoes };
    await repositorio.salvar('gabinetes', atualizado);
    res.json(atualizado);
  }));

  app.delete('/api/gabinetes/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const excluido = await repositorio.excluir('gabinetes', id);
    if (!excluido) {
      return res.status(404).json({ erro: 'Gabinete não encontrado.' });
    }
    res.json({ ok: true });
  }));

  // ---------- Usuários ----------
  app.get('/api/usuarios', asyncHandler(async (_req, res) => {
    res.json(await repositorio.listar('usuarios'));
  }));

  app.post('/api/usuarios', asyncHandler(async (req, res) => {
    const dados = req.body;
    if (!dados?.email || !dados?.nome) {
      return res.status(400).json({ erro: 'E-mail e nome são obrigatórios.' });
    }
    const uidFinal = typeof dados?.uid === 'string' && dados.uid.trim() ? dados.uid.trim() : gerarId('u_');
    const novo = {
      ...dados,
      uid: uidFinal,
      id: uidFinal,
      criadoEm: new Date().toISOString(),
    };
    await repositorio.salvar('usuarios', novo);
    res.status(201).json(novo);
  }));

  app.delete('/api/usuarios/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lista = await repositorio.listar<any>('usuarios');
    const registro = lista.find((u) => u.uid === id || u.id === id);
    if (!registro) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    const idRepositorio = registro.id ?? registro.uid;
    if (!registro.id && registro.uid) {
      await repositorio.salvar('usuarios', { ...registro, id: registro.uid });
    }
    await repositorio.excluir('usuarios', idRepositorio);
    res.json({ ok: true });
  }));

  // ---------- Composições de Gabinete ----------
  app.get('/api/composicoes', asyncHandler(async (req, res) => {
    const { gabineteId } = req.query;
    const lista = await repositorio.listar<any>('composicoes');
    const filtrada = gabineteId ? lista.filter((c) => c.gabineteId === gabineteId) : lista;
    res.json(filtrada);
  }));

  app.post('/api/composicoes', asyncHandler(async (req, res) => {
    const dados = req.body;
    if (!dados?.gabineteId || !dados?.cargos) {
      return res.status(400).json({ erro: 'Gabinete e cargos são obrigatórios.' });
    }
    const novo = { ...dados, id: gerarId('cmp_'), salvoEm: new Date().toISOString() };
    await repositorio.salvar('composicoes', novo);
    res.status(201).json(novo);
  }));

  app.delete('/api/composicoes/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const excluido = await repositorio.excluir('composicoes', id);
    if (!excluido) {
      return res.status(404).json({ erro: 'Composição não encontrada.' });
    }
    res.json({ ok: true });
  }));

  // ---------- Pedidos de Admissão ----------
  app.get('/api/admissoes', asyncHandler(async (req, res) => {
    const { gabineteId } = req.query;
    const lista = await repositorio.listar<any>('admissoes');
    const filtrada = gabineteId ? lista.filter((a) => a.gabineteId === gabineteId) : lista;
    res.json(filtrada);
  }));

  app.post('/api/admissoes', asyncHandler(async (req, res) => {
    const dados = req.body;
    if (!dados?.nome) {
      return res.status(400).json({ erro: 'Nome do(a) servidor(a) é obrigatório.' });
    }
    const novo = { ...dados, id: gerarId('adm_'), salvoEm: new Date().toISOString() };
    await repositorio.salvar('admissoes', novo);
    res.status(201).json(novo);
  }));

  app.delete('/api/admissoes/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const excluido = await repositorio.excluir('admissoes', id);
    if (!excluido) {
      return res.status(404).json({ erro: 'Pedido de admissão não encontrado.' });
    }
    res.json({ ok: true });
  }));

  // ---------- Pedidos de Exoneração ----------
  app.get('/api/exoneracoes', asyncHandler(async (req, res) => {
    const { gabineteId } = req.query;
    const lista = await repositorio.listar<any>('exoneracoes');
    const filtrada = gabineteId ? lista.filter((e) => e.gabineteId === gabineteId) : lista;
    res.json(filtrada);
  }));

  app.post('/api/exoneracoes', asyncHandler(async (req, res) => {
    const dados = req.body;
    if (!dados?.nome) {
      return res.status(400).json({ erro: 'Nome do(a) servidor(a) é obrigatório.' });
    }
    const novo = { ...dados, id: gerarId('exu_'), salvoEm: new Date().toISOString() };
    await repositorio.salvar('exoneracoes', novo);
    res.status(201).json(novo);
  }));

  app.delete('/api/exoneracoes/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const excluido = await repositorio.excluir('exoneracoes', id);
    if (!excluido) {
      return res.status(404).json({ erro: 'Pedido de exoneração não encontrado.' });
    }
    res.json({ ok: true });
  }));

  // ---------- Declarações do Servidor Nomeado ----------
  app.get('/api/declaracoes', asyncHandler(async (req, res) => {
    const { gabineteId } = req.query;
    const lista = await repositorio.listar<any>('declaracoes');
    const filtrada = gabineteId ? lista.filter((d) => d.gabineteId === gabineteId) : lista;
    res.json(filtrada);
  }));

  app.post('/api/declaracoes', asyncHandler(async (req, res) => {
    const dados = req.body;
    if (!dados?.nomeCompleto || !dados?.cpf) {
      return res.status(400).json({ erro: 'Nome completo e CPF são obrigatórios.' });
    }
    const novo = { ...dados, id: gerarId('dec_'), salvoEm: new Date().toISOString() };
    await repositorio.salvar('declaracoes', novo);
    res.status(201).json(novo);
  }));

  app.delete('/api/declaracoes/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const excluido = await repositorio.excluir('declaracoes', id);
    if (!excluido) {
      return res.status(404).json({ erro: 'Declaração não encontrada.' });
    }
    res.json({ ok: true });
  }));

  // ---------- Servir build do frontend (produção) ----------
  const distDir = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  // ---------- Último app.use: erros de qualquer rota /api ----------
  app.use((erro: unknown, _req: Request, res: Response, next: NextFunction) => {
    console.error('[api] erro não tratado:', erro);
    if (res.headersSent) return next(erro);
    res.status(500).json({ erro: 'Erro interno.' });
  });

  return app;
}
