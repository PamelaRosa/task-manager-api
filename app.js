const express = require('express');
const app = express();

const { mongoose } = require('./db/mongoose');

const bodyParser = require('body-parser');

// Carregar nos modelos do mongoose
const { List, Task } = require('./db/models');

// Carregar a middleware
app.use(bodyParser.json());

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
        res.sendStatus(200);
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


app.listen(3000, () => {
    console.log("Servidor está escutando a porta 3000");
})