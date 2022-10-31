const express = require("express");
const path = require("path");
const fs = require('fs');

const app = express();

// const livereload = require("livereload");
// const connectLiveReload = require("connect-livereload");
// const liveReloadServer = livereload.createServer();
// liveReloadServer.server.once('connection', () => {
//     setTimeout(() => {
//         liveReloadServer.refresh('/');
//     }, 100);
// });
// app.use(connectLiveReload());

const e = {
    candidates: {},
    votes: [],
    voters: 10000,
    blank: 0,
    null: 0,
    urnas: [],
    totalized: 0,
    sections: 0,
    present: 0,
    absent: 0,
    lastTime: '',
    last: {},
    history: [],
};

const url = 'https://resultados.tse.jus.br/oficial/ele2022/545/dados-simplificados/br/br-c0001-e000545-r.json';
const p = 'history';

function dumpfile(file, dados) {
    const pt = path.join(p, file);
    fs.writeFile(pt, dados, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log(pt + ' saved');
        }
    });
}

function timestamp() {
    return (new Date()).getTime() / 1000;
}

function randint(n) {
    return Math.round(Math.random() * n);
}

async function updateVotes() {
    let dados, dadosstr;
    try {
        const req = await fetch(url);
        if (req.status != 200) {
            console.error(req.status, req.statusText);
            return;
        }
        dadosstr = await req.text();
        dados = JSON.parse(dadosstr);
    } catch (e) {
        console.error(e);
        return;
    }

    const dia = dados.dt > dados.dg ? dados.dt : dados.dg;
    const hora = dados.ht > dados.hg ? dados.ht : dados.hg;

    let tstr = dia.split('/').reverse().join('-') + '-' + hora.replace(/:/g, '-');

    let last = e;
    const votes = [...e.votes];

    const mock = false;

    for (const cand of dados.cand) {
        const nm = cand.nm;
        if (!(nm in e.candidates)) {
            e.candidates[nm] = e.votes.length;
            e.votes.push(0);
        }

        if (mock) {
            e.votes[e.candidates[nm]] += randint(30000000);
        } else {
            e.votes[e.candidates[nm]] = parseInt(cand.vap);
        }
    }

    if (votes.length === 0) {
        for (const _ in e.votes) {
            votes.push(0);
        }
    }

    if (mock) {
        tstr += e.history.length;
        e.blank += randint(1000000);
        e.absent += randint(3000000);
        e.present += randint(5000000);
        e.totalized += randint(10000);
    } else {
        e.blank = parseInt(dados.vb);
        e.absent = parseInt(dados.a);
        e.present = parseInt(dados.c);
        e.totalized = parseInt(dados.st);
    }

    e.voters = parseInt(dados.e);
    e.null = parseInt(dados.vn);
    e.sections = parseInt(dados.s);

    last = {
        n: e.history.length,
        votes,
        blanknull: last.blank + last.null,
        absent: last.absent,
        present: last.present,
        totalized: last.totalized,
        time: timestamp()
    };

    if (e.lastTime !== tstr) {
        e.lastTime = tstr;
        dumpfile(tstr + '.json', dadosstr);
        if (e.totalized != 0) {
            e.history.push(last);
        }
    }

    e.last = last;
}

updateVotes();
setInterval(updateVotes, 5000);

app.use('/', express.static(path.join(__dirname, 'public')));
app.get('/history', async function(_, res) {
    const ks = [...Object.keys(e.candidates)];
    res.json({
        voters: e.voters,
        sections: e.sections,
        history: e.history,
        candidates: ks
    });
});

app.get('/update', async function(_, res) {
    res.json(Object.assign({}, e.last, {time: timestamp()}));
});

app.listen(8000);
