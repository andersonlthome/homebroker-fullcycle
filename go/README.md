Quando estamos trabalhando com o WSL2 a configuração do host.docker.internal
deve ser realizada dentro do Windows no seguinte caminho abaixo, abrindo como
admin:

C:\Windows\system32\drivers\etc\hosts (Windows)

Devemos incluir a seguinte opção: 127.0.0.1 host.docker.internal
