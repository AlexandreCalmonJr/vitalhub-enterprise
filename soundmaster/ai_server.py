import sys
import json
import re
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = 3002

class AILogic:
    @staticmethod
    def process(text):
        text = text.lower()
        response = {"text": "Desculpe, não entendi o problema de áudio. Pode descrever melhor? (Ex: 'O violão está baixo', 'A voz do pastor tem microfonia aguda').", "command": None}
        
        # NLP Baseado em Palavras-chave (Opção A - Leve e sem dependências)
        if re.search(r'(microfonia|apitando|agudo).*pastor|voz', text):
            response["text"] = "Microfonia aguda na voz é perigosa. Sugiro aplicar um corte (Cut) em 4000Hz no Master EQ para segurar o feedback."
            response["command"] = {"action": "eq_cut", "target": "master", "hz": 4000, "desc": "Cortar 4kHz no Master EQ"}
            
        elif re.search(r'(abafado|grave|embolado).*pastor|voz', text):
            response["text"] = "Som abafado na voz geralmente é excesso de frequências baixas brigando no ambiente. Sugiro atenuar a região de 300Hz (Mud)."
            response["command"] = {"action": "eq_cut", "target": "channel", "ch": 1, "hz": 300, "desc": "Cortar 300Hz no Canal da Voz"}
            
        elif re.search(r'(volume|baixo|aumenta|não ouço|nao ouço).*violão|violao', text):
            response["text"] = "Entendido. Vou preparar o comando para dar um leve ganho no fader do violão (+3dB)."
            response["command"] = {"action": "volume_up", "target": "channel", "ch": 2, "val": 3, "desc": "Aumentar Volume do Violão (+3dB)"}
            
        elif re.search(r'(vidro|eco|reverberação|igreja vazia)', text):
            response["text"] = "O eco dos vidros afeta bastante os médios-agudos. Sugiro um leve corte geral em 2.5kHz para compensar a acústica."
            response["command"] = {"action": "eq_cut", "target": "master", "hz": 2500, "desc": "Atenuação Acústica (2.5kHz) no Master"}

        elif re.search(r'(teste|ola|olá|ajuda)', text):
            response["text"] = "Olá! Sou seu Assistente de Áudio Local. Relate problemas como 'A voz está embolada' ou 'Microfonia no violão' e eu sugerirei comandos para a mesa."
            
        return response

class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/chat':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            user_text = data.get('message', '')
            result = AILogic.process(user_text)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-type")
        self.end_headers()

def run():
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, RequestHandler)
    print(f"IA Python (NLP Engine) iniciada com sucesso na porta {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()

if __name__ == '__main__':
    run()
