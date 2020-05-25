const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const {addUser,removeUser,getUser,getUsersInRoom}=require('./users.js');

const PORT = process.env.PORT || 5000;

const router = require('./router')

const app = express();

const server = http.createServer(app);
const  io = socketio(server);
//io.on action=connection is called when connection is being established
io.on('connection',(socket)=>{
    //socket.on=join action is called when user is establishing connection with a certain chat room
    socket.on('join',({name,room},callback)=>{
        const { error, user } = addUser({ id: socket.id, name, room });//adding user to the room
        if(error)return callback(error);//if adding user failed returns an error
        //connection is established
        socket.emit('message',{user:'admin',text:`${user.name}, welcome to the room ${user.room}`});//greed user with a admin message
        socket.broadcast.to(user.room).emit('message',{user:'admin',text:`${user.name}, landed!`});//let all other users know new user has joined the chat room
        socket.join(user.room);//subscribing socket to a given channel
        //now able to use to or in when broadcasting or emitting
        io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room)});//broadcast current users in the chat room
        callback();
    });
    //socket.on=sendMessage is called when message is send within a certain chat room
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);//fetch user who is trying to send a message
        io.to(user.room).emit('message', { user: user.name, text: message });//broadcast message from the user to the chat room
        io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});//broadcast current users in the chat room
        callback();
    });
    //socket.on=disconnect is called when user leaves the chat room he is currently in
    socket.on('disconnect',()=>{
        const user = removeUser(socket.id);//removing user from the users list
        if(user){
            io.to(user.room).emit('message',{user:'admin', text: `${user.name} has left.`})//broadcasting that a certain user has left
            io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});//broadcast current users in the chat room since user just left
        }
    });
});

app.use(router);

server.listen(PORT,()=>console.log(`Server has started on port ${PORT}`));