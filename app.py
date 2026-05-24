import sys
import os
import threading
import webbrowser
import time
import json

from flask import Flask, jsonify, request, render_template

def resource_path(relative):
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, relative)

app = Flask(
    __name__,
    template_folder=resource_path("templates"),
    static_folder=resource_path("static"),
)
app.config["JSON_ENSURE_ASCII"] = False
app.config["TEMPLATES_AUTO_RELOAD"] = True

import database as db

db.init_db()

PORT = 5000


# ─── helpers ─────────────────────────────────────────────────────────────────
def get_mes():
    return request.args.get("mes") or db.mes_atual()


# ═══════════════════════════════════════════════════════════════════════════════
# FRONTEND
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/")
def index():
    return render_template("index.html")


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG / RESUMO
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/resumo")
def api_resumo():
    return jsonify(db.calcular_resumo(get_mes()))


@app.route("/api/config", methods=["GET"])
def api_config_get():
    return jsonify(db.get_config())


@app.route("/api/config", methods=["POST"])
def api_config_set():
    data = request.get_json()
    for k, v in data.items():
        db.set_config(k, v)
    return jsonify({"ok": True})


# ═══════════════════════════════════════════════════════════════════════════════
# DESPESAS FIXAS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/despesas", methods=["GET"])
def api_despesas_list():
    return jsonify(db.listar_despesas(get_mes()))


@app.route("/api/despesas", methods=["POST"])
def api_despesas_create():
    data = request.get_json()
    id_novo = db.criar_despesa(data)
    return jsonify({"ok": True, "id": id_novo}), 201


@app.route("/api/despesas/<int:id>", methods=["PUT"])
def api_despesas_update(id):
    data = request.get_json()
    db.atualizar_despesa(id, data)
    # salva valor_pago para o mês
    mes = data.get("mes_ano") or get_mes()
    db.set_pagamento_despesa(id, mes, float(data.get("valor_pago", 0)))
    return jsonify({"ok": True})


@app.route("/api/despesas/<int:id>", methods=["DELETE"])
def api_despesas_delete(id):
    db.excluir_despesa(id)
    return jsonify({"ok": True})


# ═══════════════════════════════════════════════════════════════════════════════
# CARTÕES (bancos — metadados)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/bancos", methods=["GET"])
def api_bancos_list():
    return jsonify(db.listar_bancos())


@app.route("/api/bancos", methods=["POST"])
def api_bancos_create():
    data = request.get_json()
    id_novo = db.criar_banco(data)
    return jsonify({"ok": True, "id": id_novo}), 201


@app.route("/api/bancos/<int:id>", methods=["PUT"])
def api_bancos_update(id):
    data = request.get_json()
    db.atualizar_banco(id, data)
    return jsonify({"ok": True})


@app.route("/api/bancos/<int:id>", methods=["DELETE"])
def api_bancos_delete(id):
    db.excluir_banco(id)
    return jsonify({"ok": True})


# ═══════════════════════════════════════════════════════════════════════════════
# FATURAS MENSAIS (valor + pago por cartão por mês)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/faturas", methods=["GET"])
def api_faturas_list():
    return jsonify(db.listar_faturas_mes(get_mes()))


@app.route("/api/faturas/<int:banco_id>", methods=["PUT"])
def api_faturas_update(banco_id):
    data = request.get_json()
    mes = data.get("mes_ano") or get_mes()
    db.salvar_fatura(banco_id, mes, data.get("valor", 0), data.get("pago", 0))
    return jsonify({"ok": True})


# ═══════════════════════════════════════════════════════════════════════════════
# PARCELAS GRANDES
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/parcelas", methods=["GET"])
def api_parcelas_list():
    return jsonify(db.listar_parcelas(get_mes()))


@app.route("/api/parcelas", methods=["POST"])
def api_parcelas_create():
    data = request.get_json()
    id_novo = db.criar_parcela(data)
    return jsonify({"ok": True, "id": id_novo}), 201


@app.route("/api/parcelas/<int:id>", methods=["PUT"])
def api_parcelas_update(id):
    data = request.get_json()
    db.atualizar_parcela(id, data)
    return jsonify({"ok": True})


@app.route("/api/parcelas/<int:id>", methods=["DELETE"])
def api_parcelas_delete(id):
    db.excluir_parcela(id)
    return jsonify({"ok": True})


@app.route("/api/parcelas/<int:id>/pago", methods=["PUT"])
def api_parcelas_pago(id):
    data = request.get_json()
    mes = data.get("mes_ano") or get_mes()
    db.set_parcela_pago(id, mes, data.get("pago", 0))
    return jsonify({"ok": True})


# ═══════════════════════════════════════════════════════════════════════════════
# CAIXA OUTROS (filtrado por mês)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/caixa", methods=["GET"])
def api_caixa_list():
    return jsonify(db.listar_caixa(get_mes()))


@app.route("/api/caixa", methods=["POST"])
def api_caixa_create():
    data = request.get_json()
    if "mes_ano" not in data:
        data["mes_ano"] = get_mes()
    id_novo = db.criar_caixa(data)
    return jsonify({"ok": True, "id": id_novo}), 201


@app.route("/api/caixa/<int:id>", methods=["PUT"])
def api_caixa_update(id):
    data = request.get_json()
    db.atualizar_caixa(id, data)
    return jsonify({"ok": True})


@app.route("/api/caixa/<int:id>", methods=["DELETE"])
def api_caixa_delete(id):
    db.excluir_caixa(id)
    return jsonify({"ok": True})


# ═══════════════════════════════════════════════════════════════════════════════
# BACKUP / RESTORE
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/backup", methods=["GET"])
def api_backup():
    data = db.exportar_backup()
    response = app.response_class(
        response=json.dumps(data, ensure_ascii=False, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition": "attachment; filename=backup_financas.json"}
    )
    return response


@app.route("/api/restore", methods=["POST"])
def api_restore():
    data = request.get_json()
    db.importar_backup(data)
    return jsonify({"ok": True})


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def find_free_port(start=5000, end=5020):
    import socket
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("Nenhuma porta disponível entre 5000 e 5020.")


def open_browser(port):
    time.sleep(1.2)
    webbrowser.open(f"http://127.0.0.1:{port}")


if __name__ == "__main__":
    port = find_free_port()
    if not os.environ.get("NO_BROWSER"):
        t = threading.Thread(target=open_browser, args=(port,), daemon=True)
        t.start()
    app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)
