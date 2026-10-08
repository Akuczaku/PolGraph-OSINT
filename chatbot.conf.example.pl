# chatbot.conf — konfiguracja opcjonalnego AI
#
# Ten plik jest przykładem. Skopiuj go jako chatbot.conf obok programu
# i wpisz własne dane. NIE publikuj chatbot.conf, jeżeli zawiera klucz API.
#
# Każdą wartość można również nadpisać zmienną środowiskową
# CHATBOT_<NAZWA>, np. CHATBOT_ENDPOINT.

# Główny przełącznik AI:
# false = aplikacja nie kontaktuje się z serwerem AI
enabled = false

# Serwer zgodny z Ollama lub OpenAI API
# przykład Ollama: http://127.0.0.1:11434
endpoint =
api_key =
model = gemma3:12b

# Maksymalny czas oczekiwania na odpowiedź w sekundach
timeout = 25

# Sposób przekazywania klucza API
auth_header = Authorization
auth_prefix = Bearer

# Format żądań: auto | ollama | openai
api = auto

# Automatyczna transliteracja podczas przebudowy grafu.
# Jeżeli AI nie odpowie, program kontynuuje bez blokowania.
auto = true

# Limity automatycznej transliteracji
max_words = 120
batch = 15
budget = 60
