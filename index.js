const { executionAsyncResource } = require('async_hooks');
const Discord = require('discord.js');
const { measureMemory } = require ('vm');
const ytdl = require('ytdl-core');

const { YTSearcher } = require('ytsearcher');

const searcher = new YTSearcher({
    key: "AIzaSyA4q7TtqBH6w6zy8ceRJFi2qtt8BOkA9I8",
    revealed: true
});

const client = new Discord.Client();

const queue = new Map();

client.on("ready", () => {
    console.log("I am online !")
})

client.on("message", async(message) => {
    const prefix = '!';

    if(!message.content.startsWith(prefix)) return

    const serverQueue = queue.get(message.guild.id);

    const args = message.content.slice(prefix.length).trim().split(/ +/g)
    const command = args.shift().toLowerCase();

    switch(command){
        case 'play':
            execute(message, serverQueue);
            break;
        case 'stop':
            stop(message, serverQueue);
            break;
        case 'fskip':
            skip(message, serverQueue);
            break;
        case 'skip':
            vSkip(serverQueue);
            break;
        case 'pause':
            pause(serverQueue);
            break;
        case 'resume':
            resume(serverQueue);
            break;
        case 'loop':
            Loop(args, serverQueue);
            break;
        case 'queue':
            Queue(serverQueue);
            break;
    }

    async function execute(message, serverQueue){
        if(args.length <= 0)
            return message.channel.send("ใส่ชื่อเพลงด้วยจิ")

        let vc = message.member.voice.channel;
        if(!vc){
            return message.channel.send("เข้าห้องมาก่อนสิเว้ย !");
        }else{
            let result = await searcher.search(args.join(" "), { type: "video" })
            const songInfo = await ytdl.getInfo(result.first.url)

            let song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url
            };

            if(!serverQueue){
                const queueConstructor = {
                    txtChannel: message.channel,
                    vChannel: vc,
                    connection: null,
                    songs: [],
                    volume: 10,
                    playing: true,
                    loopone: false,
                    loopall: false,
                    skipVotes: []
                };
                queue.set(message.guild.id, queueConstructor);

                queueConstructor.songs.push(song);

                try{
                    let connection = await vc.join();
                    queueConstructor.connection = connection;
                    message.guild.me.voice.setSelfDeaf(true);
                    play(message.guild, queueConstructor.songs[0]);
                }catch (err){
                    console.error(err);
                    queue.delete(message.guild.id)
                    return message.channel.send(`เข้าไปไม่ได้ซักผ้าอยู่ ${err}`)
                }
            }else{
                serverQueue.songs.push(song);
                return message.channel.send(`เพิ่มเพลงให้แล้วนะจ๊ะ ${song.url}`);
            }
        }
    }
    function play(guild, song){
        const serverQueue = queue.get(guild.id);
        if(!song){
            serverQueue.vChannel.leave();
            queue.delete(guild.id);
            return;
        }
        const dispatcher = serverQueue.connection
            .play(ytdl(song.url))
            .on('finish', () =>{
                if(serverQueue.loopone){
                    play(guild, serverQueue.songs[0]);
                }
                else if(serverQueue.loopall){
                    serverQueue.songs.push(serverQueue.songs[0])
                    serverQueue.songs.shift()
                }else{
                    serverQueue.songs.shift()
                }
                play(guild, serverQueue.songs[0]);
            })
            serverQueue.txtChannel.send(`กำลังเล่น ${serverQueue.songs[0].url} อยู่นะจ๊ะ`)
    }
    function stop (message, serverQueue){
        if(!noserverQueue)
            return message.channel.send("ไม่มีเพลงเล่นอยู่เว้ย !")
        if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("เข้ามาในห้องก่อนสิเว้ย !")
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    }
    function skip (message, serverQueue){
        if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("เข้ามาในห้องก่อนสิเว้ย !")
        if(!serverQueue)
            return message.channel.send("ไม่มีเพลงมา Skip อะไร !")

        let roleN = message.guild.roles.cache.find(role => role.name === "ดีเจสมุนไพร")

        if(!message.member.roles.cache.get(roleN.id))
            return message.channel.send("แกไม่มีสิทธิ์มา Skip ช้านน !");

        serverQueue.connection.dispatcher.end();
        serverQueue.skipVotes = [];
    }

    function vSkip(ServerQueue){
        if(!noserverQueue)
            return message.channel.send("ไม่มีเพลงมา skip อะไร !");
        if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("เข้ามาในห้องก่อนสิเว้ย !")
        
        let usesC = message.member.voice.channel.members.size;
        let required = Math.ceil(usersC/2);

        if(serverQueue.skipvote.includes(message.member.id))
            return message.channel.send("เอ็งได้โหวดแล้ว !")

        serverQueue.skipVotes.push(message.member.id)
        message.channel.send(`พวกเอ็งได้โหวตเพื่อ skip เพลงไปแล้ว ${serverQueue.skipVotes.length}/${required} โหวต`)

        if(serverQueue.skipVotes.length >= required){
            serverQueue.connection.dispatcher.end();
            serverQueue.skipVotes = [];
            message.channel.send("เพลงได้ถูก skip แล้ว")
        }
    }

    function pause(serverQueue){
        if(!noserverQueue)
            return message.channel.send("ไม่มีเพลงเล่นอยู่มาหยุดอะไร !");
        if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("เข้ามาในห้องก่อนสิเว้ย !")
        if(serverQueue.connection.dispatcher.paused)
            return message.channel.send("เพลงหยุดอยู่แล้วเว้ย !");
        serverQueue.connection.dispatcher.pause();
        message.channel.send("หยุดเพลงให้แล้วนะจ๊ะ")
    }
    function resume(serverQueue){
        if(!noserverQueue)
            return message.channel.send("ไม่มีเพลงเล่นอยู่มาให้เล่นต่ออะไร !");
        if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("เข้ามาในห้องก่อนสิเว้ย !")
        if(serverQueue.connection.dispatcher.resumed)
            return message.channel.send("เล่นเพลงต่อให้แล้วเว้ย !");
        serverQueue.connection.dispatcher.resume();
        message.channel.send("เล่นเพลงต่อให้แล้วนะจ๊ะ")
    }
    function Loop(args, serverQueue){
        if(!noserverQueue)
            return message.channel.send("ไม่มีเพลงเล่นอยู่มาให้เล่นซ้ำอะไร !");
        if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("เข้ามาในห้องก่อนสิเว้ย !")

        switch(args[0].toLowerCase()){
            case 'all':
                serverQueue.loopall = !serverQueue.loopall;
                serverQueue.loopone = false;

                if(serverQueue.loopall === true)
                    message.channel.send("เล่นซ้ำทั้งหมดได้เปิดใช้งานแล้วนะจ๊ะ");
                else
                    message.channel.send("ปิดการใช้งานเล่นซ้ำทั้งหมดแล้วนะจ๊ะ");

                break;
            case 'one':
                serverQueue.loopone = !serverQueue.loopone;
                serverQueue.loopall = false;

                if(serverQueue.loopone === true)
                    message.channel.send("เล่นซ้ำเพลงเดียวได้เปิดใช้งานแล้วนะจ๊ะ");
                else
                    message.channel.send("ปิดการใช้งานเล่นซ้ำเพลงเดียวแล้วนะจ๊ะ");
                break;
            case 'off':
                serverQueue.loopall = false;
                serverQueue.loopone = false;

                message.channel.send("ปิดการใช้งานการเล่นซ้ำแล้ว")
                break;
            default:
                message.channel.send("เลือกรูปแบบการเล่นซ้ำ !loop <one/all/off>");
        }
    }
    function Queue(serverQueue){
        if(!noserverQueue)
            return message.channel.send("ไม่มีเพลงเล่นอยู่มาให้เล่นต่ออะไร !");
        if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("เข้ามาในห้องก่อนสิเว้ย !")

        let nowPlaying = serverQueue.songs[0];
        let qMsg = `กำลังเล่น ${nowPlaying.title} อยู่นะจ๊ะ\n--------------------------\n`

        for(var i = 1; i < serverQueue.songs.length; i++){
            qMsg += `${i}. ${serverQueue.songs[i].title}\n`
        }

        message.channel.send('```' + qMsg + message.author.username + ' เค้าอยากรู้ว่าเหลือเพลงอะไรบ้าง' + '```');
    }
})

client.login("NzgwNjQ5MjI3NTA3NTk3MzEy.X7yKPw.TP4anijGTKfHFi7O0x0h-JlD7rc")