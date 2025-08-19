const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// 初始化Express应用
const app = express();
app.use(cors());

// 创建HTTP服务器
const server = http.createServer(app);

// 配置Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",  // 开发环境允许所有来源，生产环境应限制具体域名
        methods: ["GET", "POST"]
    }
});

// 存储所有房间信息
const rooms = {};

// 词库
const wordBanks = {
    animals: ['狮子', '大象', '老虎', '熊猫', '猴子', '长颈鹿', '斑马', '企鹅', '海豚', '鲨鱼'],
    food: ['苹果', '香蕉', '西瓜', '蛋糕', '汉堡', '披萨', '面条', '米饭', '鸡肉', '牛肉'],
    movies: ['泰坦尼克号', '阿凡达', '复仇者联盟', '星球大战', '哈利波特', '蜘蛛侠', '蝙蝠侠', '冰雪奇缘'],
    celebrities: ['爱因斯坦', '牛顿', '达芬奇', '贝多芬', '马云', '马斯克', '成龙', '李小龙'],
    objects: ['电脑', '手机', '电视', '汽车', '自行车', '手表', '眼镜', '书本', '笔', '桌子'],
    mixed: []
};

// 初始化混合词库
function initMixedWordBank() {
    for (const key in wordBanks) {
        if (key !== 'mixed') {
            wordBanks.mixed.push(...wordBanks[key]);
        }
    }
}
initMixedWordBank();

// 生成唯一6位房间码
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (rooms[code]); // 确保房间码唯一

    return code;
}

// 处理Socket连接
io.on('connection', (socket) => {
    console.log(`新连接: ${socket.id}`);

    // 创建房间
    socket.on('host-game', (data) => {
        const { username, maxPlayers, category } = data;
        const roomCode = generateRoomCode();
        const hostId = uuidv4();

        // 创建房间
        rooms[roomCode] = {
            code: roomCode,
            host: { id: hostId, name: username, socketId: socket.id },
            players: [{
                id: hostId,
                name: username,
                socketId: socket.id,
                isHost: true
            }],
            maxPlayers: parseInt(maxPlayers),
            category,
            status: 'waiting', // waiting / playing / ended
            words: {},
            guessedPlayers: [],
            currentSpeakerIndex: 0,
            messages: []
        };

        // 加入房间频道
        socket.join(roomCode);

        // 回复房主创建成功
        socket.emit('host-success', {
            roomCode,
            players: rooms[roomCode].players.map(p => ({
                id: p.id,
                name: p.name,
                isHost: p.isHost
            }))
        });

        console.log(`房间创建: ${roomCode} 房主: ${username}`);
    });

    // 加入房间
    socket.on('join-game', (data) => {
        const { roomCode: inputCode, username } = data;
        const roomCode = inputCode.toUpperCase();
        const room = rooms[roomCode];

        // 验证房间是否存在
        if (!room) {
            socket.emit('join-result', {
                success: false,
                message: '房间不存在，请检查房间码'
            });
            return;
        }

        // 验证房间是否已满
        if (room.players.length >= room.maxPlayers) {
            socket.emit('join-result', {
                success: false,
                message: '房间已满，请选择其他房间'
            });
            return;
        }

        // 验证昵称是否已存在
        if (room.players.some(p => p.name === username)) {
            socket.emit('join-result', {
                success: false,
                message: '该昵称已被使用，请更换昵称'
            });
            return;
        }

        // 创建新玩家
        const playerId = uuidv4();
        const newPlayer = {
            id: playerId,
            name: username,
            socketId: socket.id,
            isHost: false
        };

        // 添加玩家到房间
        room.players.push(newPlayer);
        socket.join(roomCode);

        // 通知房间内所有玩家有新玩家加入
        io.to(roomCode).emit('player-joined', {
            player: { id: playerId, name: username },
            players: room.players.map(p => ({
                id: p.id,
                name: p.name,
                isHost: p.isHost
            }))
        });

        // 回复加入者成功
        socket.emit('join-result', {
            success: true,
            message: '加入成功',
            roomCode,
            host: room.host.name,
            players: room.players.map(p => ({
                id: p.id,
                name: p.name,
                isHost: p.isHost
            }))
        });

        console.log(`玩家加入: ${username} 房间: ${roomCode}`);
    });

    // 开始游戏
    socket.on('start-game', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;

        // 验证是否是房主
        if (room.host.socketId !== socket.id) {
            socket.emit('start-game-result', {
                success: false,
                message: '只有房主可以开始游戏'
            });
            return;
        }

        // 验证玩家数量
        if (room.players.length < 2) {
            socket.emit('start-game-result', {
                success: false,
                message: '至少需要2名玩家才能开始游戏'
            });
            return;
        }

        // 选择词库
        const words = room.category === 'mixed'
            ? wordBanks.mixed
            : wordBanks[room.category] || wordBanks.mixed;

        // 随机选词
        const shuffledWords = [...words].sort(() => 0.5 - Math.random());
        const selectedWords = [];

        // 为每个玩家分配词
        room.players.forEach((player, index) => {
            room.words[player.id] = shuffledWords[index];
            selectedWords.push({
                playerId: player.id,
                word: shuffledWords[index]
            });
        });

        // 更新房间状态
        room.status = 'playing';
        room.currentSpeakerIndex = 0;
        room.guessedPlayers = [];
        room.messages = [];

        // 通知房间内所有玩家游戏开始
        io.to(roomCode).emit('game-started', {
            words: selectedWords,
            currentSpeakerIndex: 0,
            players: room.players.map(p => ({ id: p.id, name: p.name }))
        });

        // 回复房主
        socket.emit('start-game-result', { success: true });
    });

    // 发送聊天消息
    socket.on('send-message', (data) => {
        const { roomCode, username, message } = data;
        const room = rooms[roomCode];
        if (!room) return;

        // 创建消息对象
        const newMessage = {
            id: Date.now(),
            username,
            text: message,
            time: new Date().toISOString()
        };

        // 保存消息
        room.messages.push(newMessage);

        // 广播消息给房间内所有玩家
        io.to(roomCode).emit('new-message', newMessage);
    });

    // 提交猜词
    socket.on('submit-guess', (data) => {
        const { roomCode, playerId, guess } = data;
        const room = rooms[roomCode];
        if (!room) return;

        // 获取正确答案
        const correctWord = room.words[playerId];
        const isCorrect = guess.trim().toLowerCase() === correctWord.toLowerCase();

        if (isCorrect) {
            // 记录猜对的玩家
            const rank = room.guessedPlayers.length + 1;
            room.guessedPlayers.push({
                playerId,
                rank,
                time: new Date()
            });

            // 检查是否所有玩家都已猜对
            const allGuessed = room.guessedPlayers.length === room.players.length;

            // 广播猜词结果
            io.to(roomCode).emit('guess-result', {
                playerId,
                isCorrect: true,
                correctWord,
                rank,
                allGuessed
            });

            // 如果游戏结束
            if (allGuessed) {
                room.status = 'ended';

                // 准备排名数据
                const ranking = room.guessedPlayers
                    .map(gp => ({
                        ...gp,
                        playerName: room.players.find(p => p.id === gp.playerId).name
                    }))
                    .sort((a, b) => a.rank - b.rank);

                // 广播游戏结束
                io.to(roomCode).emit('game-ended', { ranking });
            }
        } else {
            // 只通知当前玩家猜错了
            socket.emit('guess-result', {
                isCorrect: false,
                message: '猜错了，再试试吧！'
            });
        }
    });

    // 跳过回合
    socket.on('skip-turn', (roomCode) => {
        const room = rooms[roomCode];
        if (!room || room.status !== 'playing') return;

        // 找到下一个未猜中的玩家
        let nextIndex = (room.currentSpeakerIndex + 1) % room.players.length;
        while (room.guessedPlayers.some(gp => gp.playerId === room.players[nextIndex].id)) {
            nextIndex = (nextIndex + 1) % room.players.length;
        }

        room.currentSpeakerIndex = nextIndex;

        // 广播当前发言者变更
        io.to(roomCode).emit('speaker-changed', {
            currentSpeakerIndex: nextIndex,
            playerId: room.players[nextIndex].id
        });
    });

    // 再来一局
    socket.on('play-again', (roomCode) => {
        const room = rooms[roomCode];
        if (!room || room.host.socketId !== socket.id) return;

        // 重置游戏状态
        room.status = 'waiting';
        io.to(roomCode).emit('game-reset', { message: '房主准备开始新一局游戏' });
    });

    // 断开连接处理
    socket.on('disconnect', () => {
        console.log(`连接断开: ${socket.id}`);

        // 查找玩家所在的房间
        let playerRoom = null;
        let leavingPlayer = null;

        for (const code in rooms) {
            const room = rooms[code];
            const player = room.players.find(p => p.socketId === socket.id);
            if (player) {
                playerRoom = room;
                leavingPlayer = player;
                break;
            }
        }

        // 如果玩家在房间中
        if (playerRoom && leavingPlayer) {
            const roomCode = playerRoom.code;

            // 移除玩家
            playerRoom.players = playerRoom.players.filter(
                p => p.socketId !== socket.id
            );

            // 广播玩家离开
            io.to(roomCode).emit('player-left', {
                playerId: leavingPlayer.id,
                players: playerRoom.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    isHost: p.isHost
                }))
            });

            // 如果是房主离开，解散房间
            if (leavingPlayer.id === playerRoom.host.id) {
                io.to(roomCode).emit('room-closed', {
                    message: '房主已离开，房间已解散'
                });
                delete rooms[roomCode];
                console.log(`房间解散: ${roomCode} (房主离开)`);
            }
            // 如果房间为空，删除房间
            else if (playerRoom.players.length === 0) {
                delete rooms[roomCode];
                console.log(`房间删除: ${roomCode} (无玩家)`);
            }
        }
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
