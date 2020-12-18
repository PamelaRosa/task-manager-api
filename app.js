const express = require('express');
const app = express();

const { mongoose } = require('./db/mongoose');

const bodyParser = require('body-parser');

// Carregar nos modelos do mongoose
const { List, Task, User } = require('./db/models');


/* MIDDLEWARE */

// Carregar a middleware
app.use(bodyParser.json());

// CORS HEADER MIDDLEWARE
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
})

// Verificar middleware token de atualização (será responsável por verificar a sessão)
let verifySession = (req, res, next) => {
    // pegar o token de atualização do cabeçalho da requisição
    let refreshToken = req.header('x-refresh-token');

    // pegar o _id do cabeçalho da requisição
    let _id = req.header('id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if (!user) {
            // Usuário não foi encontrado
            return Promise.reject({
                'error': 'Usuário não foi encontrado. Tenha certeza que o token de atualização e o id do usuário estão corretos.'
            });
        }

        // Se o código alcançar aqui - o usuário foi encontrado
        // Portanto o token de atualização existe na base de dados - mas ainda necessita verificação se expirou ou não

        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;

        user.sessions.forEach((session) => {
            if (session.token === refreshToken) {
                // checar se a sessão expirou
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    // token de atualização não Expirou
                    isSessionValid = true;
                }
            }
        });
        if(isSessionValid) {
            // A sessão é válida - chame next() para continuar o processamento do web request
            next();
        } else {
            // a sessão não é valida
            return Promise.reject({
                'error': 'O token de atualização expirou ou a sessão é inválida'
            })
        }
    }).catch((e) => {
        res.status(401).send(e);
    })
};

/* FINAL DO MIDDLEWARE */

/* ROUTE HANDLERS */

/* LIST ROUTES */

/**
 * GET /lists
 * Proposito: pegar todas as listas
 */
app.get('/lists', (req, res) => {
    // Retornar um array de todas as listas no database
    List.find().then((lists) => {
        res.send(lists);
    }).catch((e) => {
        res.send(e);
    })
});

app.post('/lists', (req, res) => {
    // Criar uma nova lista e retornar o documento da nova lista de volta para o usuário ( com o ID incluso)
    // As informações da lista (campos) serão passados através do corpo de requisição do JSON 
    let title = req.body.title;

    let newList = new List({
        title
    });
    newList.save().then((listDoc) => {
        // Retorna o documento da lista inteiro ( incluindo o ID)
        res.send(listDoc);
    });

});

app.patch('/lists/:id', (req, res) => {
    // Atualizar a lista especifica (a lista com seu ID na URL) com os novos valores no corpo de requisição do JSON
    List.findOneAndUpdate({ _id: req.params.id }, {
        $set: req.body
    }).then(() => {
        res.sendStatus(200);
    });
});

app.delete('/lists/:id', (req, res) => {
    // Deletar a lista especifica ( com o ID na URL)
    List.findOneAndRemove({
        _id: req.params.id
    }).then((removedListDoc) => {
        res.send(removedListDoc);
    });
});

// Tasks methods

app.get('/lists/:listId/tasks', (req, res) => {
    // Retornar todas as tarefas que pertencem a uma lista especifica ( especificada pelo listId)
    Task.find({
        _listId: req.params.listId
    }).then((tasks) => {
        res.send(tasks);
    });
});

// Método para encontrar apenas uma tarefa utilizando o id
//Feita por questões de estudo, mas não será utilizada por enquanto.
// app.get('/lists/:listId/tasks/:taskId', (req, res) => {
//     Task.findOne({
//         _id: req.params.taskId,
//         _listId: req.params.listId
//     }).then((task) => {
//         res.send(task);
//     })
// });

app.post('/lists/:listId/tasks', (req, res) => {
    // Criar uma nova tarefa em uma lista especificada pelo listId
    let newTask = new Task({
        title: req.body.title,
        _listId: req.params.listId
    });
    newTask.save().then((newTaskDoc) => {
        res.send(newTaskDoc);
    });
});

app.patch('/lists/:listId/tasks/:taskId', (req, res) => {
    // Atualizar uma tarefa existente ( especificada pelo taskId)
    Task.findOneAndUpdate({
        _id: req.params.taskId,
        _listId: req.params.listId
    }, {
        $set: req.body
    }
    ).then(() => {
        res.send({ message: 'Atualizado com sucesso.' });
    });
});

app.delete('/lists/:listId/tasks/:taskId', (req, res) => {
    Task.findOneAndRemove({
        _id: req.params.taskId,
        _listId: req.params.listId
    }).then((removedTaskDoc) => {
        res.send(removedTaskDoc);
    });
})

/* ROTAS DO USUÁRIO */

/**
 * POST /users
 * Proposito: Inscrever-se
 */
app.post('/users', (req, res) => {
    // Inscrição do Usuário

    let body = req.body;
    let newUser = new User(body);

    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        // Sessão criada com sucesso - refreshToken retornado.
        // Agora será gerado um token autentificação de acesso para o usuário.

        return newUser.generateAccessAuthToken().then((accessToken) => {
            // Token de autorização de acesso gerado com sucesso, podendo retornar um objeto contendo os tokens de autorização
            return { accessToken, refreshToken }
        });
    }).then((authTokens) => {
        // Permite construir e enviar a resposta para o usuário com o token de acesso dele no cabeçalho e o objeto do usuário no corpo.
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    })
})


/** 
 * POST /users/login
 * Proposito: Login
 */
app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            // Sessão criada com sucesso - refreshToken retornado
            // Podemos gerar um token de autorização de acesso para o usuário

            return user.generateAccessAuthToken().then((accessToken) => {
                // Acessao token de autorização gerado com sucesso, podemos retornar um objeto contendo o token de autorização
                return { accessToken, refreshToken }
            });
        }).then((authTokens) => {
            // Permite construir e enviar a resposta para o usuário com o token de acesso dele no cabeçalho e o objeto do usuário no corpo.
            res
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);
        })
    }).catch((e) => {
        res.status(400).send(e);
    });
})

/**
 *GET /users/me/access-token
* Proposito: gerar e retornar um token de acesso
*/
app.get('/users/me/access-token', verifySession, (req, res) => {
    // sabe-se que o user/caller está autenticado e tem-se o user_id e userObject acessíveis
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
    });
})



app.listen(3000, () => {
    console.log("Servidor está escutando a porta 3000");
})