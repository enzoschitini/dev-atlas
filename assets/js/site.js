/*
 * Dev Atlas — o mapa do site. Fonte única da estrutura.
 *
 * O shell.js lê este arquivo e monta as abas, o menu lateral, a busca e os
 * links de anterior/próxima. Nenhuma página tem navegação escrita à mão.
 *
 * Uma aba
 *   id       a pasta em pages/ — só minúsculas, números e hífen
 *   label    o texto da aba no cabeçalho
 *   icon     o ícone do cartão na página inicial (window.DS.icons lista todos)
 *   summary  uma linha, usada no cartão
 *   pages    os nós da aba, na ordem em que aparecem no menu
 *
 * Dentro de `pages` cabem três tipos de nó:
 *
 *   página   { id: 'overview', label: 'Overview', summary: '...' }
 *            vira o arquivo <id>.html dentro da pasta onde o nó está
 *
 *   sessão   { group: 'SOLID', pages: [ ... ] }
 *            só um título no menu lateral — NÃO vira pasta no disco
 *
 *   pasta    { folder: 'adapter', label: 'Adapter', pages: [ ... ] }
 *            pasta de verdade: o que está dentro mora em adapter/
 *            pastas podem ficar dentro de pastas (estruturais/adapter/)
 *            começa fechada, e abre sozinha quando guarda a página aberta
 *            `open: true` faz ela já começar aberta
 *
 * Opcional em uma página
 *   empty    marca com o selo "vazio" enquanto ela não tem conteúdo
 *
 * Para criar uma página
 *   1. adicione o nó aqui, no lugar certo da árvore
 *   2. copie pages/_template.html para o caminho correspondente
 *   3. no <body>, ajuste data-root, data-tab e data-page
 *      data-page é o caminho dentro da aba, sem .html — ex.: estruturais/adapter/explicacao
 */
window.DEVMAP = {
  name: 'Dev Atlas',
  sub: 'Estudos',
  tagline: 'Meus estudos de programação, documentados em um só lugar.',

  tabs: [
    {
      id: 'linguagens',
      label: 'Linguagens',
      icon: 'code',
      summary: 'As linguagens que uso no dia a dia: sintaxe, idiomas e armadilhas.',
      pages: [
        {
          id: 'overview',
          label: 'Overview',
          summary: 'As linguagens que uso no dia a dia: sintaxe, idiomas e armadilhas.'
        },
        {
          id: 'python',
          label: 'Python',
          summary: 'Sintaxe, idiomas da linguagem e o que costuma dar errado.',
          empty: true
        },
        {
          id: 'sql',
          label: 'SQL',
          summary: 'Consultas, junções, janelas e o que muda de um banco para outro.',
          empty: true
        }
      ]
    },
    {
      id: 'clean-code',
      label: 'Clean Code',
      icon: 'code',
      summary: 'Princípios e padrões para escrever código que outra pessoa entende.',
      pages: [
        {
          id: 'overview',
          label: 'Overview',
          summary: 'O que entra nesta aba, como ela está dividida e o formato das páginas.'
        },
        {
          group: 'SOLID',
          pages: [
            {
              id: 'introducao',
              label: 'Introdução',
              summary: 'Os cinco princípios, o que cada um resolve e por onde começar.'
            },
            {
              id: 'single-responsibility',
              label: 'Single Responsibility',
              summary: 'Como dar a cada motivo de mudança a sua própria classe, para uma mudança não arrastar as outras.'
            },
            {
              id: 'open-closed',
              label: 'Open/Closed',
              summary: 'Como acrescentar um caso novo escrevendo código novo, sem reabrir o que já funcionava.'
            },
            {
              id: 'liskov-substitution',
              label: 'Liskov Substitution',
              summary: 'Como garantir que a subclasse entra no lugar da base sem que quem chama precise perguntar o tipo.'
            },
            {
              id: 'interface-segregation',
              label: 'Interface Segregation',
              summary: 'Como evitar interfaces largas que obrigam a implementar, e a conhecer, o que não se usa.'
            },
            {
              id: 'dependency-inversion',
              label: 'Dependency Inversion',
              summary: 'Como fazer a regra de negócio mandar na infraestrutura, e não o contrário.'
            }
          ]
        },
        {
          group: 'Design Pattern',
          pages: [
            {
              id: 'patterns-introducao',
              label: 'Introdução',
              summary: 'O que são os padrões, o que cada grupo resolve e a tabela com os 23 patterns.'
            },
            {
              id: 'patterns-frequencia',
              label: 'Frequência de uso',
              summary: 'Quais padrões aparecem mais no dia a dia e por onde começar a estudar.'
            },
            {
              folder: 'criacionais',
              label: 'Criacionais',
              pages: [
                {
                  folder: 'singleton',
                  label: 'Singleton',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como garantir que um objeto existe uma vez só e que todo mundo chega nele.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Cinco situações reais, com o código antes e depois do Singleton.'
                    }
                  ]
                },
                {
                  folder: 'factory-method',
                  label: 'Factory Method',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como criar um objeto sem saber a classe exata, entregando a escolha às subclasses.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Quatro situações reais, com o código antes e depois do Factory Method.'
                    }
                  ]
                },
                {
                  folder: 'abstract-factory',
                  label: 'Abstract Factory',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como criar um conjunto de objetos que combinam entre si, sem misturar peças de famílias diferentes.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois da Abstract Factory.'
                    }
                  ]
                },
                {
                  folder: 'builder',
                  label: 'Builder',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como montar um objeto complexo por partes e só entregá-lo quando estiver completo e válido.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do Builder.'
                    }
                  ]
                },
                {
                  folder: 'prototype',
                  label: 'Prototype',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como criar um objeto copiando outro que já existe, sem conhecer a classe nem os campos.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do Prototype.'
                    }
                  ]
                }
              ]
            },
            {
              folder: 'estruturais',
              label: 'Estruturais',
              pages: [
                {
                  folder: 'adapter',
                  label: 'Adapter',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como encaixar uma interface que você não controla na que o seu código espera.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Sete situações reais, com o código antes e depois do Adapter.'
                    }
                  ]
                },
                {
                  folder: 'bridge',
                  label: 'Bridge',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como deixar duas coisas que variam por motivos diferentes crescerem separadas, sem uma subclasse para cada combinação.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do Bridge.'
                    }
                  ]
                },
                {
                  folder: 'composite',
                  label: 'Composite',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como tratar um item e um grupo de itens do mesmo jeito, em qualquer profundidade.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Quatro situações reais, com o código antes e depois do Composite.'
                    }
                  ]
                },
                {
                  folder: 'decorator',
                  label: 'Decorator',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como acrescentar comportamento a um objeto sem mexer nele e sem uma subclasse para cada combinação.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do Decorator.'
                    }
                  ]
                },
                {
                  folder: 'facade',
                  label: 'Facade',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como dar uma porta de entrada simples para um conjunto de peças que só funcionam na ordem certa.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do Facade.'
                    }
                  ]
                },
                {
                  folder: 'flyweight',
                  label: 'Flyweight',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como manter centenas de milhares de objetos sem repetir em cada um o que é igual para todos do mesmo tipo.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do Flyweight.'
                    }
                  ]
                },
                {
                  folder: 'proxy',
                  label: 'Proxy',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como pôr um representante no lugar de um objeto, para controlar se, quando ou onde o real é usado.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do Proxy.'
                    }
                  ]
                }
              ]
            },
            {
              folder: 'comportamentais',
              label: 'Comportamentais',
              pages: [
                {
                  folder: 'chain-of-responsibility',
                  label: 'Chain of Responsibility',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como passar um pedido por uma sequência de tratadores, sem quem pede saber qual deles responde.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Quatro situações reais, com o código antes e depois do Chain of Responsibility.'
                    }
                  ]
                },
                {
                  folder: 'command',
                  label: 'Command',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como transformar um pedido de ação em um objeto, para guardar, desfazer, enfileirar ou repetir.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Quatro situações reais, com o código antes e depois do Command.'
                    }
                  ]
                },
                {
                  folder: 'interpreter',
                  label: 'Interpreter',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como representar regras que mudam como uma árvore de objetos que se avalia sozinha.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do Interpreter.'
                    }
                  ]
                },
                {
                  folder: 'iterator',
                  label: 'Iterator',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como percorrer uma coleção, ou uma fonte de dados, sem depender de como ela guarda os elementos.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do Iterator.'
                    }
                  ]
                },
                {
                  folder: 'mediator',
                  label: 'Mediator',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como deixar um grupo de objetos trabalhar junto sem que cada um conheça todos os outros.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do Mediator.'
                    }
                  ]
                },
                {
                  folder: 'memento',
                  label: 'Memento',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como guardar o estado de um objeto para voltar a ele depois, sem expor o que tem dentro.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Quatro situações reais, com o código antes e depois do Memento.'
                    }
                  ]
                },
                {
                  folder: 'observer',
                  label: 'Observer',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como avisar várias partes do sistema de que algo aconteceu, sem quem avisa saber quem são elas.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Cinco situações reais, com o código antes e depois do Observer.'
                    }
                  ]
                },
                {
                  folder: 'state',
                  label: 'State',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como fazer um objeto se comportar de um jeito em cada fase da vida, sem um if sobre a fase em cada método.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do State.'
                    }
                  ]
                },
                {
                  folder: 'strategy',
                  label: 'Strategy',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como trocar o jeito de fazer uma coisa sem mexer em quem a pede, e sem um if novo a cada jeito.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Quatro situações reais, com o código antes e depois do Strategy.'
                    }
                  ]
                },
                {
                  folder: 'template-method',
                  label: 'Template Method',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como escrever uma vez a ordem dos passos de um processo, deixando cada variação preencher só o passo que é diferente.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do Template Method.'
                    }
                  ]
                },
                {
                  folder: 'visitor',
                  label: 'Visitor',
                  pages: [
                    {
                      id: 'explicacao',
                      label: 'Explicação',
                      summary: 'Como acrescentar operações a uma estrutura de objetos de tipos diferentes sem abrir cada classe.'
                    },
                    {
                      id: 'uso',
                      label: 'Uso',
                      summary: 'Três situações reais, com o código antes e depois do Visitor.'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'frameworks',
      label: 'Frameworks',
      icon: 'boxes',
      summary: 'Frameworks para montar aplicações com IA e agentes.',
      pages: [
        {
          id: 'overview',
          label: 'Overview',
          summary: 'Frameworks para montar aplicações com IA e agentes.'
        },
        {
          id: 'langchain',
          label: 'LangChain',
          summary: 'Cadeias, agentes, ferramentas e memória para aplicações com LLM.',
          empty: true
        },
        {
          id: 'agno',
          label: 'Agno',
          summary: 'Agentes, times de agentes e ferramentas com o Agno.',
          empty: true
        }
      ]
    },
    {
      id: 'ferramentas',
      label: 'Ferramentas',
      icon: 'bolt',
      summary: 'Serviços e ferramentas externas que entram nos projetos.',
      pages: [
        {
          id: 'overview',
          label: 'Overview',
          summary: 'Serviços e ferramentas externas que entram nos projetos.'
        },
        {
          id: 'elevenlabs',
          label: 'ElevenLabs',
          summary: 'Voz sintética: vozes, API e como encaixar em um fluxo.',
          empty: true
        },
        {
          id: 'tableau',
          label: 'Tableau',
          summary: 'Painéis e visualização de dados.',
          empty: true
        }
      ]
    },
    {
      id: 'bancos-de-dados',
      label: 'Bancos de dados',
      icon: 'layout',
      summary: 'Onde os dados moram: relacional, documentos, arquivos e vetores.',
      pages: [
        {
          id: 'overview',
          label: 'Overview',
          summary: 'Onde os dados moram: relacional, documentos, arquivos e vetores.'
        },
        {
          id: 'postgres',
          label: 'Postgres',
          summary: 'Modelagem, índices, consultas e administração.',
          empty: true
        },
        {
          id: 'mongodb',
          label: 'MongoDB',
          summary: 'Documentos, coleções e quando fazem sentido.',
          empty: true
        },
        {
          id: 's3',
          label: 'S3',
          summary: 'Armazenamento de objetos: buckets, permissões e custos.',
          empty: true
        },
        {
          id: 'supabase',
          label: 'Supabase',
          summary: 'Postgres, autenticação e storage como serviço.',
          empty: true
        },
        {
          id: 'pinecone',
          label: 'Pinecone',
          summary: 'Banco vetorial para busca semântica e RAG.',
          empty: true
        }
      ]
    },
    {
      id: 'devops',
      label: 'DevOps',
      icon: 'folder',
      summary: 'Colocar no ar, observar e manter funcionando.',
      pages: [
        {
          id: 'overview',
          label: 'Overview',
          summary: 'Colocar no ar, observar e manter funcionando.'
        },
        {
          id: 'servers',
          label: 'Servers',
          summary: 'Servidores: configuração, acesso e manutenção.',
          empty: true
        },
        {
          id: 'metrics',
          label: 'Metrics',
          summary: 'O que medir, como coletar e como ler.',
          empty: true
        },
        {
          id: 'optimization',
          label: 'Optimization',
          summary: 'Achar o gargalo e reduzir tempo e custo.',
          empty: true
        },
        {
          id: 'security',
          label: 'Security',
          summary: 'Segredos, acessos e o básico para não ser o elo fraco.',
          empty: true
        },
        {
          id: 'aws',
          label: 'AWS',
          summary: 'Os serviços da AWS que aparecem nos projetos.',
          empty: true
        },
        {
          id: 'vercel',
          label: 'Vercel',
          summary: 'Deploy, domínios, variáveis e logs na Vercel.',
          empty: true
        }
      ]
    },
    {
      id: 'arquitetura',
      label: 'Arquitetura e Algoritmos',
      icon: 'list',
      summary: 'Como os sistemas se conectam e quanto custa cada decisão.',
      pages: [
        {
          id: 'overview',
          label: 'Overview',
          summary: 'Como os sistemas se conectam e quanto custa cada decisão.'
        },
        {
          folder: 'integracao-entre-sistemas',
          label: 'Integração entre sistemas',
          pages: [
            { id: 'overview', label: 'Overview', summary: 'Os padrões de comunicação entre sistemas, em seis grupos.' },
            {
              folder: 'sincrono',
              label: 'Síncrono',
              pages: [
                { id: 'request-response', label: 'Request-response', summary: 'Um cliente faz uma requisição e espera a resposta do serviço. É a base da web.' },
                { id: 'grpc', label: 'RPC / gRPC', summary: 'Você chama um método de outro serviço como se fosse uma função local, com contrato definido antes.' },
                { id: 'graphql', label: 'GraphQL', summary: 'Uma única consulta em que o cliente escolhe exatamente os campos que quer, vindos de vários recursos.' }
              ]
            },
            {
              folder: 'assincrono',
              label: 'Assíncrono',
              pages: [
                { id: 'fila', label: 'Fila de mensagens', summary: 'O produtor coloca mensagens numa fila e segue; consumidores retiram e processam no seu ritmo.' },
                { id: 'pubsub', label: 'Pub/Sub', summary: 'Um publicador emite um evento num tópico; todos os assinantes interessados recebem uma cópia.' },
                { id: 'webhook', label: 'Webhooks', summary: 'Em vez de você perguntar, o serviço externo chama uma URL sua quando algo acontece.' },
                { id: 'reqreply', label: 'Request-reply assíncrono', summary: 'O pedido vai por uma fila e a resposta volta por outra, ligadas por um identificador de correlação.' }
              ]
            },
            {
              folder: 'tempo-real',
              label: 'Tempo real e push',
              pages: [
                { id: 'polling', label: 'Polling e long polling', summary: 'O cliente pergunta de tempos em tempos se há novidade (polling) ou o servidor segura a pergunta até ter algo (long polling).' },
                { id: 'websocket', label: 'WebSocket', summary: 'Uma conexão que fica aberta e permite que cliente e servidor enviem mensagens a qualquer momento.' },
                { id: 'sse', label: 'Server-Sent Events', summary: 'O navegador abre uma conexão HTTP e o servidor vai enviando eventos por ela, só nesse sentido.' },
                { id: 'streaming', label: 'Streaming de eventos', summary: 'Eventos fluem continuamente por um log distribuído e vários consumidores leem e processam em tempo real.' },
                { id: 'mqtt', label: 'MQTT', summary: 'Protocolo pub/sub minimalista, pensado para sensores e dispositivos com pouca banda e energia.' }
              ]
            },
            {
              folder: 'lote',
              label: 'Lote e dados',
              pages: [
                { id: 'batch', label: 'Batch', summary: 'Os dados se acumulam e um job processa tudo de uma vez, em hora marcada ou quando o lote enche.' },
                { id: 'cdc', label: 'CDC', summary: 'Captura cada alteração feita no banco (insert, update, delete) e a publica como evento.' }
              ]
            },
            {
              folder: 'coordenacao',
              label: 'Coordenação e consistência',
              pages: [
                { id: 'saga', label: 'Saga', summary: 'Uma operação que atravessa vários serviços é dividida em passos locais, cada um com uma ação que o desfaz.' },
                { id: 'outbox', label: 'Outbox', summary: 'O evento é gravado no mesmo banco, na mesma transação do dado; um processo à parte o publica no broker.' },
                { id: 'eventsourcing', label: 'Event sourcing', summary: 'Em vez de guardar só o estado atual, guarda-se cada mudança como um evento imutável.' },
                { id: 'cqrs', label: 'CQRS', summary: 'Usa modelos diferentes para escrever (comandos) e para ler (consultas), cada um otimizado para a sua função.' },
                { id: 'scatter', label: 'Scatter-gather', summary: 'Um pedido é espalhado para vários serviços em paralelo e as respostas são combinadas numa só.' },
                { id: 'gossip', label: 'Gossip', summary: 'Cada nó conta o que sabe para alguns vizinhos aleatórios, e a informação se espalha como um boato.' }
              ]
            },
            {
              folder: 'infra',
              label: 'Infraestrutura de apoio',
              pages: [
                { id: 'gateway', label: 'API Gateway', summary: 'Um ponto de entrada que recebe todas as requisições externas e as encaminha ao serviço certo.' },
                { id: 'mesh', label: 'Service mesh', summary: 'Proxies ao lado de cada serviço cuidam da comunicação interna (segurança, retentativas, métricas) sem mudar o código.' }
              ]
            }
          ]
        },
        {
          id: 'cache',
          label: 'Cache',
          summary: 'O que guardar, por quanto tempo e como invalidar.',
          empty: true
        },
        {
          id: 'big-o',
          label: 'Big O',
          summary: 'Complexidade de tempo e espaço, para comparar soluções.',
          empty: true
        }
      ]
    },
    {
      id: 'research',
      label: 'Research',
      icon: 'globe',
      summary: 'Pesquisa: notícias, Claude, projetos e documentações.',
      pages: [
        {
          id: 'overview',
          label: 'Overview',
          summary: 'Pesquisa: notícias, Claude, projetos e documentações.'
        },
        {
          id: 'news-blogs',
          label: 'News/Blogs',
          summary: 'Notícias e blogs que vale acompanhar.',
          empty: true
        },
        {
          id: 'claude',
          label: 'Claude',
          summary: 'Novidades, recursos e jeitos de usar o Claude.',
          empty: true
        },
        {
          id: 'projects',
          label: 'Projects',
          summary: 'Projetos que estudo ou uso de referência.',
          empty: true
        },
        {
          id: 'documentations',
          label: 'Documentations',
          summary: 'Documentações oficiais que consulto com frequência.',
          empty: true
        }
      ]
    },
    {
      id: 'github',
      label: 'GitHub',
      icon: 'edit',
      summary: 'Fluxo de trabalho no Git e no GitHub.',
      pages: [
        {
          id: 'overview',
          label: 'Overview',
          summary: 'Fluxo de trabalho no Git e no GitHub.'
        },
        {
          id: 'commits',
          label: 'Commits',
          summary: 'Como escrever commits que contam a história do projeto.',
          empty: true
        }
      ]
    },
    {
      id: 'data-insights',
      label: 'Data Insights',
      icon: 'note',
      summary: 'Transformar dados em decisão.',
      pages: [
        {
          id: 'overview',
          label: 'Overview',
          summary: 'Transformar dados em decisão.'
        },
        {
          id: 'crisp',
          label: 'CRISP',
          summary: 'O ciclo CRISP-DM para projetos de dados.',
          empty: true
        }
      ]
    }
  ]
};
