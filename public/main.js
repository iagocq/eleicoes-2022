let eleicao;
let candidates;
let elem = {};
let colors = {
    'Lula': 'rgb(193, 36, 31)',
    'Jair Bolsonaro': 'rgb(36, 31, 193)',
};

function htmlDecode(input) {
    var doc = new DOMParser().parseFromString(input, "text/html");
    return doc.documentElement.textContent;
}

function last(v) {
    return v[v.length-1];
}

async function fetchJson(...args) {
    return await (await fetch(...args)).json();
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    let history = {};

    while (true) {
        history = await fetchJson('history');
        if (history.candidates) break;
        await sleep(5000);
    }

    function titlecase(s) {
        return `${s[0].toUpperCase()}${s.slice(1).toLowerCase()}`;
    }

    candidates = history.candidates.map(v => htmlDecode(v).split(' ').map(titlecase).join(' '));

    const toclone = document.getElementById('clone');
    const paste = document.getElementById('paste');
    for (const cand of candidates) {
        const clone = toclone.cloneNode(true);
        paste.append(clone);
        clone.id = '';
        elem[cand] = clone;
    }

    eleicao = elNew(history.history, history.candidates.length, history.voters, history.sections);

    await update(true);
    setInterval(update, 5000);

    rotate([['a', 10], ['b', 1], ['a', 10], ['b', 1], ['c', 1]], pollIsClose);
    // rotate([['a', 5/60], ['b', 5/60], ['a', 5/60], ['b', 5/60], ['c', 5/60]], pollIsClose);
    // rotate([['a', 1/60], ['c', 10]], pollIsClose);
}

function pollIsClose() {
    const vs = elVotes(eleicao);
    const towin = elNeededToWin(eleicao);

    if (vs.some(v => last(v) >= towin * 0.8) && !vs.some(v => last(v) >= towin)) {
        return 'a';
    }
}

function* repeat(r) {
    let i = 0;
    while (true) {
        yield r[i];
        i = (i + 1) % r.length;
    }
}

async function rotate(r, override) {
    let last = {};
    for (const [d, m] of repeat(r)) {
        let ov;
        if (override) {
            ov = override();
        }
        const e = ov ? document.getElementById(ov) : document.getElementById(d);
        if (last.id !== e.id)
            last.className = 'ahidden';
        setTimeout(() => {
            e.className = 'ashown';
            if (last.id !== e.id) {
                last.className = 'hidden';
            }
            last = e;
        }, 1000);
        while (ov) {
            ov = override();
            await sleep(1000);
        }
        await sleep(m * 60 * 1000);
    }
}

function percentage(n) {
    return n.toFixed(2).toString().replace(/\./g, ',');
}

function number(n) {
    let s = Math.round(n).toString();
    let parts = [];
    let i = 0;
    while (i < s.length) {
        let mod = (s.length - i) % 3;
        let size = mod == 0 ? 3 : mod;

        parts.push(s.slice(i, i + size));
        i += size;
    }
    return parts.join(' ');
}

function updateText(v, p, s, st, tw, bn, abs) {
    document.getElementById('decisao').innerText = number(tw);

    let i = 0;
    let sm = 0;
    for (const [name, e] of Object.entries(elem)) {
        const [enome, evotos, epercent, evenc] = e.getElementsByTagName('span');
        enome.innerText = name;
        const vc = last(v[i]);
        sm += vc;
        evotos.innerText = number(vc);
        if (vc > tw) {
            evenc.className = '';
        } else {
            evenc.className = 'hidden';
        }

        let pc = last(p[i]);
        if (pc !== pc) pc = 0;
        epercent.innerText = percentage(pc);
        i += 1;
    }

    const [es, est, esp] = document.getElementById('secoes').getElementsByTagName('span');
    es.innerText = number(last(s));
    est.innerText = number(eleicao.sections);
    esp.innerText = percentage(last(st));

    const [ebnt, ebnp] = document.getElementById('bn').getElementsByTagName('span');
    let vbn = last(bn);
    ebnt.innerText = number(vbn);
    ebnp.innerText = percentage(vbn / (sm + vbn) * 100);

    const [ec, ecp, ea, eap] = document.getElementById('comp').getElementsByTagName('span');
    let cn = last(elPresent(eleicao));
    let an = last(abs);
    ec.innerText = number(cn);
    ea.innerText = number(an);
    ecp.innerText = percentage(cn / (cn + an) * 100);
    eap.innerText = percentage(an / (cn + an) * 100);
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function minmaxrange(xrange, x, ys) {
    let min = Infinity;
    let max = -Infinity;

    for (const i in x) {
        if (x[i] < xrange[0]) continue;
        if (x[i] > xrange[1]) break;

        for (const y of ys) {
            if (y[i] < min) min = y[i];
            if (y[i] > max) max = y[i];
        }
    }

    return [min * 0.95, max * 1.05];
}

async function update(noupdate) {
    if (!noupdate) {
        const update = await fetchJson('update');
        elUpdate(eleicao, update);
        console.log(update);
    }

    let time = [];
    for (const t of elTimes(eleicao)) {
        const date = new Date(t * 1000);
        time.push(date);
    }

    const vs = elVotes(eleicao);
    const inv = elInvalidVotes(eleicao);
    const need = elNeededToWinOverTime(eleicao);
    const percentage = elPercentage(eleicao);
    const absent = elAbsent(eleicao);
    const lastTime = last(time);
    const xrange = [new Date(lastTime - 10*60*1000), lastTime];
    
    const xaxis = {range: xrange};

    const towin = elNeededToWin(eleicao);
    const showdecisao = vs.some(v => last(v) >= towin * 0.7);
    const showbn = !showdecisao || vs.some(v => last(v) >= towin * 1.02);
    // const showbn = true;

    const yvalues = [...vs].concat(showdecisao ? [need] : []).concat(showbn ? [inv, absent] : []);
    const newyrangev = minmaxrange(xrange, time, yvalues);
    const newyrangep = minmaxrange(xrange, time, percentage);

    const layout = {
        xaxis: {
            showline: false,
            showgrid: false,
            tickformat: '%H:%M',
            showticklabel: true,
            ticks: 'outside',
        },
        yaxis: {
            type: 'linear',
            rangemode: 'nonnegative',
        },
    };

    const vlayout = Object.assign(clone(layout), {
        width: 720,
    });
    //132
    const playout = Object.assign(clone(layout), {
        showlegend: false,
        width: 588,
    });

    let vf = vs.map((y, i) => ({
        name: candidates[i],
        x: time,
        y,
        mode: 'lines',
        line: {
            color: colors[candidates[i]]
        }
    }));

    const bn = [{
        name: 'Votos Brancos e Nulos',
        x: time,
        y: inv,
        mode: 'lines',
        line: {
            dash: 'dashdot',
            color: 'rgb(150, 150, 150)'
        }
    }, {
        name: 'Abstenções',
        x: time,
        y: absent,
        mode: 'lines',
        line: {
            dash: 'dashdot',
            color: 'rgb(40, 40, 40)'
        }
    }];

    if (showdecisao) {
        vf = vf.concat({
            name: 'Decisão',
            x: time,
            y: need,
            mode: 'lines',
            line: {
                dash: 'dashdot',
                color: 'rgb(31, 193, 36)'
            }
        });
    }

    if (showbn) {
        vf = vf.concat(bn);
    }

    Plotly.react('v30', vf, Object.assign(clone(vlayout), {
        title: 'Total de Votos (últimos 10 minutos)',
        xaxis: Object.assign({}, vlayout.xaxis, xaxis),
        yaxis: Object.assign({}, vlayout.yaxis, {
            range: newyrangev
        })
    }));

    if (!showbn) {
        vf = vf.concat(bn);
    }

    Plotly.react('vf', vf, Object.assign(clone(vlayout), {
        title: 'Total de Votos',
    }));

    const pf = percentage.map((y, i) => ({
        name: candidates[i],
        x: time,
        y,
        mode: 'lines',
        line: {
            color: colors[candidates[i]]
        }
    }));

    Plotly.react('p30', pf, Object.assign(clone(playout), {
        title: 'Porcentagem de Votos (últimos 10 minutos)',
        xaxis: Object.assign({}, playout.xaxis, xaxis),
        yaxis: Object.assign({}, layout.yaxis, {
            range: newyrangep
        })
    }));

    Plotly.react('pf', pf, Object.assign(clone(playout), {
        title: 'Porcentagem de Votos',
    }));

    const spercentage = elTotalizedPercentage(eleicao);
    const ps = [{
        x: time,
        y: spercentage,
        mode: 'lines'
    }];

    Plotly.react('ps', ps, Object.assign(clone(playout), {
        title: 'Porcentagem de Seções Totalizadas',
    }));

    Plotly.react('pt', [{
        type: 'pie',
        values: [...vs.map(v => last(v)), last(inv), last(absent)],
        labels: [...candidates, 'Votos Brancos e Nulos', 'Abstenções'],
        textinfo: 'label+percent',
        marker: {
            colors: [...candidates.map(v => colors[v]), 'rgb(150, 150, 150)', 'rgb(40, 40, 40)']
        }
    }], playout);

    updateText(vs, percentage, elTotalized(eleicao), spercentage, towin, inv, absent);
}

window.addEventListener('load', main);
