import sqlite3
import os
import sys
import json
from datetime import datetime

# Detecta se está rodando como exe compilado (PyInstaller ou Nuitka)
def _get_base_dir():
    if getattr(sys, "frozen", False):          # PyInstaller
        return os.path.dirname(sys.executable)
    try:
        if __compiled__:                        # Nuitka
            return os.path.dirname(sys.executable)
    except NameError:
        pass
    return os.path.dirname(os.path.abspath(__file__))  # dev

_BASE_DIR = _get_base_dir()

DB_PATH = os.path.join(_BASE_DIR, "financas.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def mes_atual():
    return datetime.now().strftime("%Y-%m")


def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS config (
            chave TEXT PRIMARY KEY,
            valor TEXT
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS despesas_fixas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            icone TEXT DEFAULT 'receipt',
            valor REAL NOT NULL DEFAULT 0,
            no_cartao INTEGER NOT NULL DEFAULT 0,
            ordem INTEGER NOT NULL DEFAULT 0,
            ativo INTEGER NOT NULL DEFAULT 1,
            criado_em TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    # Tabela de cartões (nome + cor apenas — sem saldo/pago aqui)
    c.execute("""
        CREATE TABLE IF NOT EXISTS bancos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cor TEXT DEFAULT '#6366f1',
            ordem INTEGER NOT NULL DEFAULT 0
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS parcelas_grandes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            icone TEXT DEFAULT 'credit-card',
            valor_parcela REAL NOT NULL DEFAULT 0,
            parcelas_pagas INTEGER NOT NULL DEFAULT 0,
            total_parcelas INTEGER NOT NULL DEFAULT 1,
            no_cartao INTEGER NOT NULL DEFAULT 0,
            ativo INTEGER NOT NULL DEFAULT 1,
            mes_inicio TEXT DEFAULT '',
            tipo TEXT NOT NULL DEFAULT 'pagar',
            criado_em TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS caixa_outros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            icone TEXT DEFAULT 'shopping-bag',
            valor REAL NOT NULL DEFAULT 0,
            pago INTEGER NOT NULL DEFAULT 0,
            mes_ano TEXT NOT NULL DEFAULT '',
            criado_em TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    # Fatura mensal por cartão (valor + pago por mês)
    c.execute("""
        CREATE TABLE IF NOT EXISTS faturas_mensais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            banco_id INTEGER NOT NULL,
            mes_ano TEXT NOT NULL,
            valor REAL NOT NULL DEFAULT 0,
            pago INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(banco_id) REFERENCES bancos(id) ON DELETE CASCADE,
            UNIQUE(banco_id, mes_ano)
        )
    """)

    # Pagamento de parcela por mês
    c.execute("""
        CREATE TABLE IF NOT EXISTS pagamentos_parcela (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parcela_id INTEGER NOT NULL,
            mes_ano TEXT NOT NULL,
            pago INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(parcela_id) REFERENCES parcelas_grandes(id) ON DELETE CASCADE,
            UNIQUE(parcela_id, mes_ano)
        )
    """)

    # Valor pago por despesa fixa por mês
    c.execute("""
        CREATE TABLE IF NOT EXISTS pagamentos_despesa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            despesa_id INTEGER NOT NULL,
            mes_ano TEXT NOT NULL,
            valor_pago REAL NOT NULL DEFAULT 0,
            FOREIGN KEY(despesa_id) REFERENCES despesas_fixas(id) ON DELETE CASCADE,
            UNIQUE(despesa_id, mes_ano)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS pagamentos_mensais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mes TEXT NOT NULL,
            ano INTEGER NOT NULL,
            despesa_id INTEGER,
            parcela_id INTEGER,
            caixa_id INTEGER,
            tipo TEXT NOT NULL,
            valor_pago REAL NOT NULL DEFAULT 0,
            pago INTEGER NOT NULL DEFAULT 0,
            criado_em TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    # Config padrão
    c.execute("INSERT OR IGNORE INTO config (chave, valor) VALUES ('salario', '0')")
    c.execute("INSERT OR IGNORE INTO config (chave, valor) VALUES ('saldo_caixa', '0')")

    # ── Migrações para bancos legados ─────────────────────────────
    # Remove colunas antigas (saldo/pago) da tabela bancos se existirem
    # SQLite não suporta DROP COLUMN diretamente em versões < 3.35,
    # então apenas ignoramos as colunas extras se existirem.
    # Garante que mes_ano existe em caixa_outros
    try:
        c.execute("ALTER TABLE caixa_outros ADD COLUMN mes_ano TEXT NOT NULL DEFAULT ''")
    except Exception:
        pass

    # Garante que categoria existe em despesas_fixas
    try:
        c.execute("ALTER TABLE despesas_fixas ADD COLUMN categoria TEXT DEFAULT 'outros'")
    except Exception:
        pass

    # Garante que mes_inicio existe em parcelas_grandes
    try:
        c.execute("ALTER TABLE parcelas_grandes ADD COLUMN mes_inicio TEXT DEFAULT ''")
    except Exception:
        pass
    try:
        c.execute("ALTER TABLE parcelas_grandes ADD COLUMN tipo TEXT NOT NULL DEFAULT 'pagar'")
    except Exception:
        pass

    # Migra parcelas existentes: calcula mes_inicio a partir de parcelas_pagas
    mes_agora = datetime.now().strftime("%Y-%m")
    ano_a, mes_a = int(mes_agora[:4]), int(mes_agora[5:])
    parcelas_sem_inicio = c.execute(
        "SELECT id, parcelas_pagas FROM parcelas_grandes WHERE mes_inicio IS NULL OR mes_inicio = ''"
    ).fetchall()
    for row in parcelas_sem_inicio:
        pagas = row[0 if isinstance(row, tuple) else "parcelas_pagas"] if isinstance(row, tuple) else row["parcelas_pagas"]
        pid   = row[0] if isinstance(row, tuple) else row["id"]
        # recua N meses para encontrar o mês de início
        total_meses = mes_a - 1 - (pagas - 1) + (ano_a - 1) * 12  # índice absoluto
        ini_abs = (ano_a * 12 + mes_a - 1) - pagas
        ini_ano = ini_abs // 12
        ini_mes = ini_abs % 12 + 1
        mes_ini_str = f"{ini_ano:04d}-{ini_mes:02d}"
        c.execute("UPDATE parcelas_grandes SET mes_inicio=? WHERE id=?", (mes_ini_str, pid))

    conn.commit()
    conn.close()


# ─── CONFIG ──────────────────────────────────────────────────────────────────

def get_config():
    conn = get_conn()
    rows = conn.execute("SELECT chave, valor FROM config").fetchall()
    conn.close()
    return {r["chave"]: r["valor"] for r in rows}


def set_config(chave, valor):
    conn = get_conn()
    conn.execute("INSERT OR REPLACE INTO config (chave, valor) VALUES (?,?)", (chave, str(valor)))
    conn.commit()
    conn.close()


# ─── DESPESAS FIXAS ──────────────────────────────────────────────────────────

def listar_despesas(mes_ano=None):
    """Retorna despesas com valor_pago referente ao mês informado."""
    conn = get_conn()
    if mes_ano:
        rows = conn.execute("""
            SELECT d.id, d.nome, d.icone, d.valor, d.no_cartao, d.ordem, d.ativo, d.criado_em,
                   COALESCE(d.categoria, 'outros') AS categoria,
                   COALESCE(p.valor_pago, 0) AS valor_pago
            FROM despesas_fixas d
            LEFT JOIN pagamentos_despesa p ON p.despesa_id = d.id AND p.mes_ano = ?
            WHERE d.ativo = 1
            ORDER BY d.ordem, d.id
        """, (mes_ano,)).fetchall()
    else:
        rows = conn.execute(
            "SELECT *, COALESCE(categoria,'outros') AS categoria, 0 AS valor_pago FROM despesas_fixas WHERE ativo=1 ORDER BY ordem, id"
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def criar_despesa(data):
    conn = get_conn()
    max_ordem = conn.execute("SELECT COALESCE(MAX(ordem),0) FROM despesas_fixas").fetchone()[0]
    conn.execute(
        "INSERT INTO despesas_fixas (nome, icone, valor, no_cartao, ordem, categoria) VALUES (?,?,?,?,?,?)",
        (data["nome"], data.get("icone", "receipt"), float(data.get("valor", 0)),
         int(data.get("no_cartao", 0)), max_ordem + 1, data.get("categoria", "outros"))
    )
    conn.commit()
    id_novo = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return id_novo


def atualizar_despesa(id, data):
    conn = get_conn()
    conn.execute(
        "UPDATE despesas_fixas SET nome=?, icone=?, valor=?, no_cartao=?, categoria=? WHERE id=?",
        (data["nome"], data.get("icone", "receipt"), float(data.get("valor", 0)),
         int(data.get("no_cartao", 0)), data.get("categoria", "outros"), id)
    )
    conn.commit()
    conn.close()


def set_pagamento_despesa(despesa_id, mes_ano, valor_pago):
    """Salva o valor pago de uma despesa para um mês específico."""
    conn = get_conn()
    conn.execute("""
        INSERT INTO pagamentos_despesa (despesa_id, mes_ano, valor_pago)
        VALUES (?, ?, ?)
        ON CONFLICT(despesa_id, mes_ano) DO UPDATE SET valor_pago = excluded.valor_pago
    """, (despesa_id, mes_ano, valor_pago))
    conn.commit()
    conn.close()


def excluir_despesa(id):
    conn = get_conn()
    conn.execute("UPDATE despesas_fixas SET ativo=0 WHERE id=?", (id,))
    conn.commit()
    conn.close()


# ─── BANCOS / CARTÕES ────────────────────────────────────────────────────────

def listar_bancos():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM bancos ORDER BY ordem, id").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def criar_banco(data):
    conn = get_conn()
    max_ordem = conn.execute("SELECT COALESCE(MAX(ordem),0) FROM bancos").fetchone()[0]
    conn.execute(
        "INSERT INTO bancos (nome, cor, ordem) VALUES (?,?,?)",
        (data["nome"], data.get("cor", "#6366f1"), max_ordem + 1)
    )
    conn.commit()
    id_novo = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return id_novo


def atualizar_banco(id, data):
    conn = get_conn()
    conn.execute(
        "UPDATE bancos SET nome=?, cor=? WHERE id=?",
        (data["nome"], data.get("cor", "#6366f1"), id)
    )
    conn.commit()
    conn.close()


def excluir_banco(id):
    conn = get_conn()
    conn.execute("DELETE FROM bancos WHERE id=?", (id,))
    conn.commit()
    conn.close()


# ─── FATURAS MENSAIS ─────────────────────────────────────────────────────────

def listar_faturas_mes(mes_ano):
    """Retorna lista de {banco_id, nome, cor, valor, pago} para o mês."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT b.id AS banco_id, b.nome, b.cor, b.ordem,
               COALESCE(f.valor, 0) AS valor,
               COALESCE(f.pago,  0) AS pago
        FROM bancos b
        LEFT JOIN faturas_mensais f ON f.banco_id = b.id AND f.mes_ano = ?
        ORDER BY b.ordem, b.id
    """, (mes_ano,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def salvar_fatura(banco_id, mes_ano, valor, pago):
    conn = get_conn()
    conn.execute("""
        INSERT INTO faturas_mensais (banco_id, mes_ano, valor, pago)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(banco_id, mes_ano) DO UPDATE SET valor = excluded.valor, pago = excluded.pago
    """, (banco_id, mes_ano, float(valor), int(pago)))
    conn.commit()
    conn.close()


# ─── PARCELAS GRANDES ────────────────────────────────────────────────────────

def _calcular_parcela_atual(mes_inicio, mes_ano):
    """Retorna o número da parcela atual (1-indexed) para o mês informado."""
    try:
        ano_i, mes_i = int(mes_inicio[:4]), int(mes_inicio[5:])
        ano_v, mes_v = int(mes_ano[:4]),    int(mes_ano[5:])
        diff = (ano_v - ano_i) * 12 + (mes_v - mes_i)
        return diff + 1
    except Exception:
        return 1


def listar_parcelas(mes_ano=None):
    """Retorna parcelas ativas no mês informado com parcela_atual e pago calculados."""
    if not mes_ano:
        mes_ano = mes_atual()
    conn = get_conn()
    rows = conn.execute("SELECT * FROM parcelas_grandes WHERE ativo=1 ORDER BY id").fetchall()
    pagamentos = {r["parcela_id"]: r["pago"] for r in conn.execute(
        "SELECT parcela_id, pago FROM pagamentos_parcela WHERE mes_ano=?", (mes_ano,)
    ).fetchall()}
    conn.close()

    result = []
    for p in [dict(r) for r in rows]:
        mes_ini = p.get("mes_inicio") or mes_ano
        parcela_atual = _calcular_parcela_atual(mes_ini, mes_ano)
        if parcela_atual < 1 or parcela_atual > p["total_parcelas"]:
            continue
        p["parcela_atual"]  = parcela_atual
        p["parcelas_pagas"] = parcela_atual - 1
        p["restantes"]      = p["total_parcelas"] - parcela_atual
        p["pago"]           = pagamentos.get(p["id"], 0)
        result.append(p)
    return result


def set_parcela_pago(parcela_id, mes_ano, pago):
    conn = get_conn()
    conn.execute("""
        INSERT INTO pagamentos_parcela (parcela_id, mes_ano, pago)
        VALUES (?, ?, ?)
        ON CONFLICT(parcela_id, mes_ano) DO UPDATE SET pago = excluded.pago
    """, (parcela_id, mes_ano, int(pago)))
    conn.commit()
    conn.close()


def criar_parcela(data):
    mes_inicio = data.get("mes_inicio") or mes_atual()
    tipo = data.get("tipo", "pagar")
    conn = get_conn()
    conn.execute(
        "INSERT INTO parcelas_grandes (nome, icone, valor_parcela, total_parcelas, no_cartao, mes_inicio, tipo) VALUES (?,?,?,?,?,?,?)",
        (data["nome"], data.get("icone", "credit-card"), float(data.get("valor_parcela", 0)),
         int(data.get("total_parcelas", 1)), int(data.get("no_cartao", 0)), mes_inicio, tipo)
    )
    conn.commit()
    id_novo = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return id_novo


def atualizar_parcela(id, data):
    mes_inicio = data.get("mes_inicio") or mes_atual()
    tipo = data.get("tipo", "pagar")
    conn = get_conn()
    conn.execute(
        "UPDATE parcelas_grandes SET nome=?, icone=?, valor_parcela=?, total_parcelas=?, no_cartao=?, mes_inicio=?, tipo=? WHERE id=?",
        (data["nome"], data.get("icone", "credit-card"), float(data.get("valor_parcela", 0)),
         int(data.get("total_parcelas", 1)), int(data.get("no_cartao", 0)), mes_inicio, tipo, id)
    )
    conn.commit()
    conn.close()


def excluir_parcela(id):
    conn = get_conn()
    conn.execute("UPDATE parcelas_grandes SET ativo=0 WHERE id=?", (id,))
    conn.commit()
    conn.close()


# ─── CAIXA OUTROS ────────────────────────────────────────────────────────────

def listar_caixa(mes_ano=None):
    conn = get_conn()
    if mes_ano:
        rows = conn.execute(
            "SELECT * FROM caixa_outros WHERE mes_ano=? ORDER BY id DESC", (mes_ano,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM caixa_outros ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def criar_caixa(data):
    conn = get_conn()
    conn.execute(
        "INSERT INTO caixa_outros (nome, icone, valor, pago, mes_ano) VALUES (?,?,?,?,?)",
        (data["nome"], data.get("icone", "shopping-bag"), float(data.get("valor", 0)),
         int(data.get("pago", 0)), data.get("mes_ano", mes_atual()))
    )
    conn.commit()
    id_novo = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return id_novo


def atualizar_caixa(id, data):
    conn = get_conn()
    conn.execute(
        "UPDATE caixa_outros SET nome=?, icone=?, valor=?, pago=? WHERE id=?",
        (data["nome"], data.get("icone", "shopping-bag"), float(data.get("valor", 0)),
         int(data.get("pago", 0)), id)
    )
    conn.commit()
    conn.close()


def excluir_caixa(id):
    conn = get_conn()
    conn.execute("DELETE FROM caixa_outros WHERE id=?", (id,))
    conn.commit()
    conn.close()


# ─── RESUMO / DASHBOARD ──────────────────────────────────────────────────────

def calcular_resumo(mes_ano=None):
    if not mes_ano:
        mes_ano = mes_atual()

    cfg = get_config()
    salario      = float(cfg.get("salario", 0))
    saldo_caixa  = float(cfg.get("saldo_caixa", 0))

    despesas = listar_despesas(mes_ano)
    parcelas = listar_parcelas(mes_ano)
    caixa    = listar_caixa(mes_ano)
    faturas  = listar_faturas_mes(mes_ano)

    total_despesas_fixas = sum(d["valor"] for d in despesas)
    total_despesas_pagas = sum(d["valor_pago"] for d in despesas)
    total_despesas_falta = sum(max(0, d["valor"] - d["valor_pago"]) for d in despesas)

    parc_pagar   = [p for p in parcelas if p.get("tipo", "pagar") == "pagar"]
    parc_receber = [p for p in parcelas if p.get("tipo") == "receber"]

    total_parcelas         = sum(p["valor_parcela"] for p in parc_pagar)
    total_parcelas_pagas   = sum(p["valor_parcela"] for p in parc_pagar if p.get("pago"))
    total_parcelas_falta   = total_parcelas - total_parcelas_pagas

    total_parc_receber       = sum(p["valor_parcela"] for p in parc_receber)
    total_parc_receber_receb = sum(p["valor_parcela"] for p in parc_receber if p.get("pago"))
    total_parc_receber_falta = total_parc_receber - total_parc_receber_receb

    total_caixa      = sum(c["valor"] for c in caixa)
    total_caixa_pago = sum(c["valor"] for c in caixa if c["pago"])
    total_caixa_falta= sum(c["valor"] for c in caixa if not c["pago"])

    total_faturas       = sum(f["valor"] for f in faturas)
    total_faturas_pagas = sum(f["valor"] for f in faturas if f["pago"])
    total_faturas_falta = sum(f["valor"] for f in faturas if not f["pago"])

    # Total já pago (saídas confirmadas)
    total_pago = total_despesas_pagas + total_parcelas_pagas + total_faturas_pagas

    # Total ainda pendente
    total_pendente = total_despesas_falta + total_parcelas_falta + total_faturas_falta

    # Saldo = receitas − o que ainda falta pagar
    # (cada coisa paga aumenta o saldo porque reduz o pendente)
    # Saldo = receitas − pendente a pagar
    sobra = (salario + saldo_caixa + total_caixa + total_parc_receber) - total_pendente

    # Total projetado (orçamento completo do mês — só saídas)
    total_gastos = total_despesas_fixas + total_parcelas + total_faturas

    return {
        "mes_ano": mes_ano,
        "salario": salario,
        "saldo_caixa": saldo_caixa,
        "total_despesas_fixas": total_despesas_fixas,
        "total_despesas_pagas": total_despesas_pagas,
        "total_despesas_falta": total_despesas_falta,
        "total_parcelas": total_parcelas,
        "total_parcelas_pagas": total_parcelas_pagas,
        "total_parcelas_falta": total_parcelas_falta,
        "total_parc_receber": total_parc_receber,
        "total_parc_receber_receb": total_parc_receber_receb,
        "total_parc_receber_falta": total_parc_receber_falta,
        "total_caixa": total_caixa,
        "total_caixa_pago": total_caixa_pago,
        "total_caixa_falta": total_caixa_falta,
        "total_faturas": total_faturas,
        "total_faturas_pagas": total_faturas_pagas,
        "total_faturas_falta": total_faturas_falta,
        "total_gastos": total_gastos,
        "total_pago": total_pago,
        "total_pendente": total_pendente,
        "sobra": sobra,
    }


# ─── HISTÓRICO ───────────────────────────────────────────────────────────────

def historico_meses(mes_ref, n=6):
    """Retorna resumo dos últimos n meses (incluindo mes_ref)."""
    ano, mes = int(mes_ref[:4]), int(mes_ref[5:7])
    result = []
    for i in range(n - 1, -1, -1):
        total_abs = ano * 12 + mes - 1 - i
        a = total_abs // 12
        m = total_abs % 12 + 1
        mes_ano = f"{a:04d}-{m:02d}"
        r = calcular_resumo(mes_ano)
        result.append({
            "mes": mes_ano,
            "entradas": r["salario"] + r["saldo_caixa"] + r["total_caixa"] + r["total_parc_receber"],
            "saidas": r["total_gastos"],
            "saldo": r["sobra"],
        })
    return result


# ─── BACKUP / RESTORE ────────────────────────────────────────────────────────

def exportar_backup():
    conn = get_conn()
    faturas = [dict(r) for r in conn.execute("SELECT * FROM faturas_mensais").fetchall()]
    pagamentos = [dict(r) for r in conn.execute("SELECT * FROM pagamentos_despesa").fetchall()]
    conn.close()
    return {
        "config": get_config(),
        "despesas_fixas": listar_despesas(),
        "bancos": listar_bancos(),
        "faturas_mensais": faturas,
        "parcelas_grandes": listar_parcelas(),
        "caixa_outros": listar_caixa(),
        "pagamentos_despesa": pagamentos,
        "exportado_em": datetime.now().isoformat(),
    }


def importar_backup(data):
    conn = get_conn()
    c = conn.cursor()

    if "config" in data:
        for k, v in data["config"].items():
            c.execute("INSERT OR REPLACE INTO config (chave, valor) VALUES (?,?)", (k, v))

    if "despesas_fixas" in data:
        c.execute("DELETE FROM despesas_fixas")
        for d in data["despesas_fixas"]:
            c.execute(
                "INSERT INTO despesas_fixas (id,nome,icone,valor,no_cartao,ordem,ativo,criado_em) VALUES (?,?,?,?,?,?,?,?)",
                (d.get("id"), d["nome"], d.get("icone","receipt"), d.get("valor",0),
                 d.get("no_cartao",0), d.get("ordem",0), d.get("ativo",1),
                 d.get("criado_em", datetime.now().isoformat()))
            )

    if "bancos" in data:
        c.execute("DELETE FROM bancos")
        for b in data["bancos"]:
            c.execute(
                "INSERT INTO bancos (id,nome,cor,ordem) VALUES (?,?,?,?)",
                (b.get("id"), b["nome"], b.get("cor","#6366f1"), b.get("ordem",0))
            )

    if "faturas_mensais" in data:
        c.execute("DELETE FROM faturas_mensais")
        for f in data["faturas_mensais"]:
            c.execute(
                "INSERT INTO faturas_mensais (id,banco_id,mes_ano,valor,pago) VALUES (?,?,?,?,?)",
                (f.get("id"), f["banco_id"], f["mes_ano"], f.get("valor",0), f.get("pago",0))
            )

    if "parcelas_grandes" in data:
        c.execute("DELETE FROM parcelas_grandes")
        for p in data["parcelas_grandes"]:
            c.execute(
                "INSERT INTO parcelas_grandes (id,nome,icone,valor_parcela,parcelas_pagas,total_parcelas,no_cartao,ativo,criado_em) VALUES (?,?,?,?,?,?,?,?,?)",
                (p.get("id"), p["nome"], p.get("icone","credit-card"), p.get("valor_parcela",0),
                 p.get("parcelas_pagas",0), p.get("total_parcelas",1), p.get("no_cartao",0),
                 p.get("ativo",1), p.get("criado_em", datetime.now().isoformat()))
            )

    if "caixa_outros" in data:
        c.execute("DELETE FROM caixa_outros")
        for cx in data["caixa_outros"]:
            c.execute(
                "INSERT INTO caixa_outros (id,nome,icone,valor,pago,mes_ano,criado_em) VALUES (?,?,?,?,?,?,?)",
                (cx.get("id"), cx["nome"], cx.get("icone","shopping-bag"), cx.get("valor",0),
                 cx.get("pago",0), cx.get("mes_ano", mes_atual()),
                 cx.get("criado_em", datetime.now().isoformat()))
            )

    if "pagamentos_despesa" in data:
        c.execute("DELETE FROM pagamentos_despesa")
        for p in data["pagamentos_despesa"]:
            c.execute(
                "INSERT INTO pagamentos_despesa (id,despesa_id,mes_ano,valor_pago) VALUES (?,?,?,?)",
                (p.get("id"), p["despesa_id"], p["mes_ano"], p.get("valor_pago",0))
            )

    conn.commit()
    conn.close()
