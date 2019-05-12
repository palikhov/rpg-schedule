const express = require('express');
const discord = require('discord.js');

const Game = require('../models/game');
const GuildConfig = require('../models/guild-config');
const config = require('../models/config');

module.exports = (options) => {
    const router = express.Router();
    const { client } = options;
    
    router.use(config.urls.game.create, async (req, res, next) => {
        try {
            let game;
            let server = req.query.s;

            if (req.query.g) {
                game = await Game.fetch(req.query.g);
                if (game) {
                    server = game.s;
                } else {
                    throw new Error('Game not found');
                }
            }

            if (server) {
                const guild = client.guilds.get(server);
        
                if (guild) {
                    let channelId;
                    let password;

                    const config = await GuildConfig.fetch(guild.id);
                    if (config) password = config.password;

                    if (req.query.g) {
                        channelId = game.c;
                    }
                    else {
                        if (config) channelId = config.channel;
                    }
    
                    const channel = guild.channels.get(channelId) || guild.channels.array().find(c => c instanceof discord.TextChannel);
    
                    if (!channel) {
                        throw new Error('Discord channel not found');
                    }
    
                    let data = {
                        title: req.query.g ? 'Edit Game' : 'New Game',
                        guild: guild.name,
                        channel: channel.name,
                        s: server,
                        c: channel.id,
                        dm: '',
                        adventure: '',
                        runtime: '',
                        where: '',
                        reserved: '',
                        description: '',
                        players: 7,
                        method: 'automated',
                        customSignup: '',
                        when: 'datetime',
                        date: '',
                        time: '',
                        timezone: '',
                        reminder: '0',
                        is: {
                            newgame: !req.query.g ? true : false,
                            editgame: req.query.g ? true : false
                        },
                        password: password ? password : false,
                        errors: {
                            dm: false
                        }
                    };
    
                    if (req.query.g) {
                        data = { ...data, ...game };
                    }
    
                    if (req.method === 'POST') {
                        data.dm = req.body.dm;
                        data.adventure = req.body.adventure;
                        data.runtime = req.body.runtime;
                        data.where = req.body.where;
                        data.description = req.body.description;
                        data.reserved = req.body.reserved;
                        data.method = req.body.method;
                        data.customSignup = req.body.customSignup;
                        data.when = req.body.when;
                        data.date = req.body.date;
                        data.time = req.body.time;
                        data.timezone = req.body.timezone;
                        data.reminder = req.body.reminder;
                        data.players = req.body.players;
                    }
                    
                    if (req.method === 'POST') {
                        Game.save(channel, { ...game, ...req.body }).then(response => {
                            if (response.modified) res.redirect(config.urls.game.create+'?g='+response._id);
                            else res.render('game', data);
                        }).catch(err => {
                            data.errors.dm = err.message.startsWith('DM') ? err.message : false;
                            res.render('game', data);
                        });
                    } else {
                        res.render('game', data);
                    }
                } else {
                    throw new Error('Discord server not found');
                }
            } else {
                throw new Error('Discord server not specified');
            }
        } catch(err) {
            res.render('error', { message: err });
        }
    });

    router.get(config.urls.game.delete, async (req, res, next) => {
        try {
            if (req.query.g) {
                const game = await Game.fetch(req.query.g);
                if (!game) throw new Error('Game not found');
                const serverId = game.s;
                const channelId = game.c;

                const guild = client.guilds.get(serverId);
                if (guild) {
                    const channel = guild.channels.get(channelId);

                    Game.delete(game, channel).then(response => {
                        res.redirect(config.urls.game.create+'?s='+serverId);
                    });
                } else {
                    throw new Error('Server not found');
                }
            } else {
                throw new Error('Game not found');
            }
        } catch(err) {
            res.render('error', { message: err });
        }
    });
    
    return router;
};