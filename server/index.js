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
    aanimals: [
        // 哺乳动物
        "狮子", "大象", "老虎", "熊猫", "猴子", "长颈鹿", "斑马", "袋鼠", "考拉", "犀牛",
        "河马", "狼", "熊", "狐狸", "兔子", "猫", "狗", "牛", "羊", "马",
        "猪", "鹿", "骆驼", "蝙蝠", "松鼠", "黄鼠狼", "水獭", "海狮", "海豹", "海象",
        "鲸鱼", "猩猩", "狒狒", "长臂猿", "穿山甲", "食蚁兽", "刺猬", "豪猪", "土拨鼠", "河狸",
        "雪豹", "猎豹", "美洲豹", "北极熊", "棕熊", "黑熊", "红熊猫", "树懒", "犰狳", "海牛",
        
        // 鸟类
        "鸽子", "乌鸦", "喜鹊", "麻雀", "燕子", "孔雀", "鸵鸟", "火烈鸟", "天鹅", "大雁",
        "海鸥", "鹦鹉", "八哥", "画眉", "啄木鸟", "猫头鹰", "白鹭", "丹顶鹤", "朱鹮", "蜂鸟",
        
        // 水生动物
        "企鹅", "海豚", "鲨鱼", "金鱼", "鲤鱼", "草鱼", "鲈鱼", "三文鱼", "金枪鱼", "鳕鱼",
        "鳗鱼", "章鱼", "乌贼", "虾", "蟹", "龙虾", "海星", "水母", "海马", "海龙",
        
        // 爬行动物与两栖动物
        "蛇", "蜥蜴", "鳄鱼", "乌龟", "海龟", "青蛙", "蟾蜍", "蝾螈", "变色龙", "眼镜蛇",
        
        // 昆虫与节肢动物
        "蚂蚁", "蜜蜂", "蝴蝶", "蜻蜓", "蚊子", "苍蝇", "蟑螂", "蝗虫", "蟋蟀", "螳螂",
        "蜘蛛", "蝎子", "蜈蚣", "甲虫", "瓢虫"
    ],
    food: [
        // 水果类
        "苹果", "香蕉", "西瓜", "橙子", "葡萄", "草莓", "蓝莓", "芒果", "菠萝", "猕猴桃",
        "柚子", "柠檬", "樱桃", "荔枝", "龙眼", "榴莲", "山竹", "火龙果", "哈密瓜", "木瓜",
        
        // 蔬菜类
        "白菜", "萝卜", "黄瓜", "西红柿", "土豆", "茄子", "辣椒", "豆角", "菠菜", "芹菜",
        "韭菜", "洋葱", "大蒜", "生姜", "南瓜", "冬瓜", "丝瓜", "苦瓜", "西兰花", "菜花",
        
        // 主食类
        "面条", "米饭", "馒头", "包子", "饺子", "馄饨", "油条", "粥", "烧饼", "面包",
        "燕麦", "玉米", "红薯", "紫薯", "米线", "粉丝", "年糕", "粽子", "汤圆", "煎饼",
        
        // 肉类与海鲜
        "鸡肉", "牛肉", "猪肉", "羊肉", "鸭肉", "鱼肉", "虾", "蟹", "鱿鱼", "章鱼",
        "贝类", "三文鱼", "金枪鱼", "火腿", "香肠", "培根", "牛排", "排骨", "猪蹄", "鸡翅",
        
        // 甜点与零食
        "蛋糕", "饼干", "巧克力", "糖果", "冰淇淋", "布丁", "果冻", "蛋挞", "泡芙", "马卡龙",
        "曲奇", "薯片", "坚果", "蜜饯", "果干", "巧克力派", "威化饼", "棉花糖", "芝麻糊", "绿豆糕",
        
        // 饮品
        "牛奶", "豆浆", "果汁", "可乐", "雪碧", "茶", "咖啡", "奶茶", "啤酒", "红酒"
    ],
    movies: [
        // 好莱坞经典大片
        "泰坦尼克号", "阿凡达", "复仇者联盟", "星球大战", "哈利波特", "蜘蛛侠", "蝙蝠侠", "冰雪奇缘",
        "指环王", "侏罗纪公园", "速度与激情", "变形金刚", "黑客帝国", "星际穿越", "盗梦空间",
        "肖申克的救赎", "阿甘正传", "教父", "狮子王", "终结者", "黑客帝国", "加勒比海盗", "玩具总动员",
        "复仇者联盟4", "黑豹", "奇异博士", "雷神", "美国队长", "钢铁侠", "银河护卫队",
        
        // 华语经典电影
        "霸王别姬", "无间道", "让子弹飞", "大话西游", "唐伯虎点秋香", "英雄", "卧虎藏龙", "赤壁",
        "喜剧之王", "少林足球", "功夫", "天下无贼", "泰囧", "战狼2", "流浪地球", "哪吒之魔童降世",
        "少年的你", "我不是药神", "飞驰人生", "夏洛特烦恼", "红海行动", "美人鱼", "西游降魔篇",
        
        // 日韩电影
        "千与千寻", "龙猫", "幽灵公主", "你的名字", "釜山行", "寄生虫", "熔炉", "辩护人",
        "告白", "入殓师", "情书", "七武士", "菊次郎的夏天", "东京物语", "小偷家族",
        
        // 动画电影
        "寻梦环游记", "疯狂动物城", "海底总动员", "超人总动员", "料理鼠王", "飞屋环游记", "怪兽电力公司",
        "头脑特工队", "冰雪奇缘2", "蜘蛛侠：平行宇宙", "赛车总动员", "神偷奶爸", "小黄人大眼萌",
        "功夫熊猫", "花木兰", "阿拉丁", "狮子王", "美女与野兽",
        
        // 科幻与奇幻
        "银翼杀手", "异形", "终结者2", "E.T.外星人", "回到未来", "火星救援", "地心引力", "环太平洋",
        "明日边缘", "少数派报告", "记忆碎片", "第六感", "蝴蝶效应",
        
        // 动作与冒险
        "007", "碟中谍", "古墓丽影", "夺宝奇兵", "虎胆龙威", "第一滴血", "杀死比尔", "疾速追杀",
        "王牌特工", "极限特工", "侠盗联盟",
        
        // 喜剧与爱情
        "当哈利遇到莎莉", "罗马假日", "泰坦尼克号", "爱在黎明破晓前", "怦然心动", "真爱至上",
        "拜见岳父大人", "博物馆奇妙夜", "乌龙兄弟", "伴娘",
        
        // 悬疑与惊悚
        "七宗罪", "致命ID", "搏击俱乐部", "禁闭岛", "盗梦空间", "消失的爱人", "恐怖游轮", "电锯惊魂"
    ],
    celebrities: [
        // 科学家与发明家
        "爱因斯坦", "牛顿", "达芬奇", "居里夫人", "霍金", "特斯拉", "爱迪生", "诺贝尔", 
        "伽利略", "哥白尼", "达尔文", "杨振宁", "钱学森", "袁隆平", "屠呦呦", "瓦特", 
        "莱特兄弟", "贝尔", "富兰克林", "门捷列夫",
        
        // 艺术家与文学家
        "贝多芬", "莫扎特", "巴赫", "梵高", "毕加索", "达芬奇", "莎士比亚", "托尔斯泰", 
        "鲁迅", "金庸", "李白", "杜甫", "莫扎特", "肖邦", "卓别林", "宫崎骏", 
        "贝多芬", "梅兰芳", "徐悲鸿", "泰戈尔",
        
        // 商业与科技领袖
        "马云", "马斯克", "比尔·盖茨", "乔布斯", "扎克伯格", "任正非", "贝佐斯", "巴菲特", 
        "李嘉诚", "董明珠", "雷军", "马斯克", "马化腾", "李彦宏", "张一鸣", "库克",
        
        // 影视与娱乐明星
        "成龙", "李小龙", "周润发", "周星驰", "刘德华", "张国荣", "杨幂", "吴京", 
        "汤姆·克鲁斯", "莱昂纳多", "安吉丽娜·朱莉", "斯皮尔伯格", "李安", "张艺谋", 
        "冯小刚", "憨豆先生", "泰勒·斯威夫特", "迈克尔·杰克逊", "麦当娜", "周杰伦",
        
        // 体育明星
        "乔丹", "梅西", "C罗", "贝利", "马拉多纳", "姚明", "刘翔", "苏炳添", 
        "孙杨", "马龙", "张继科", "李娜", "费德勒", "纳达尔", "博尔特", "菲尔普斯",
        
        // 政治家与历史人物
        "毛泽东", "邓小平", "孙中山", "秦始皇", "李世民", "林肯", "华盛顿", "丘吉尔", 
        "曼德拉", "甘地", "拿破仑", "普京", "奥巴马", "罗斯福", "戴高乐",
        
        // 其他领域知名人物
        "甘地", "特蕾莎修女", "居里夫人", "海伦·凯勒", "爱迪生", "霍金", "爱因斯坦", 
        "特斯拉", "弗洛伊德", "尼采", "柏拉图", "亚里士多德", "孔子", "老子", "佛陀"
    ],
    objects: [
        // 电子设备
        "电脑", "手机", "电视", "相机", "耳机", "音箱", "打印机", "扫描仪", "路由器", "充电宝",
        "手表", "手环", "平板电脑", "游戏机", "投影仪", "微波炉", "冰箱", "洗衣机", "空调", "热水器",
        
        // 交通工具
        "汽车", "自行车", "摩托车", "电动车", "公交车", "地铁", "火车", "飞机", "轮船", "出租车",
        "滑板", "平衡车", "轮椅", "婴儿车", "叉车", "挖掘机", "消防车", "救护车", "警车", "卡车",
        
        // 穿戴用品
        "眼镜", "帽子", "围巾", "手套", "鞋子", "袜子", "衣服", "裤子", "裙子", "外套",
        "手表", "项链", "耳环", "戒指", "腰带", "背包", "手提包", "行李箱", "口罩", "手套",
        
        // 文具与办公用品
        "书本", "笔", "纸", "笔记本", "文件夹", "订书机", "胶带", "剪刀", "尺子", "橡皮",
        "计算器", "便利贴", "印章", "印泥", "笔筒", "书架", "台灯", "文件夹", "回形针", "修正液",
        
        // 家居用品
        "桌子", "椅子", "沙发", "床", "衣柜", "书架", "地毯", "窗帘", "镜子", "花瓶",
        "台灯", "吊灯", "闹钟", "垃圾桶", "扫帚", "拖把", "水桶", "抹布", "衣架", "晾衣绳",
        
        // 厨房用品
        "锅", "碗", "瓢", "盆", "筷子", "勺子", "叉子", "刀", "砧板", "水壶",
        "保温杯", "饭盒", "洗洁精", "洗碗布", "垃圾袋", "保鲜膜", "擀面杖", "菜刀", "锅铲", "漏勺",
        
        // 工具与器械
        "锤子", "螺丝刀", "扳手", "钳子", "锯子", "斧头", "卷尺", "手电筒", "打火机", "火柴"
    ],
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
                message: '房间不存在哦~，请检查房间码'
            });
            return;
        }

        // 验证房间是否已满
        if (room.players.length >= room.maxPlayers) {
            socket.emit('join-result', {
                success: false,
                message: '房间已经满啦~，请选择其他房间'
            });
            return;
        }

        // 验证昵称是否已存在
        if (room.players.some(p => p.name === username)) {
            socket.emit('join-result', {
                success: false,
                message: '目前该昵称已被使用，请换一个吧~'
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
                message: '只有房主可以开始游戏哦~'
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
                message: '猜错了，不是这个哟~~再试试吧！'
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
                    message: '房主已离开，房间已瓦解'
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
