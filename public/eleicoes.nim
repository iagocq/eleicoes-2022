import sequtils
import sugar
import std/[enumerate, math]

type
  Update = object
    n: int
    votes: seq[int]
    blanknull: int
    absent: int
    present: int
    totalized: int
    time: int

  Eleicao = ref object
    candidates: int
    voters: int
    sections: int
    history: seq[Update]
    lastUpdate: Update

iterator updates(el: Eleicao): Update =
  if el.lastUpdate.votes.len == 0:
    var votes: seq[int] = @[]
    for _ in 1..el.candidates:
      votes.add(0)
    yield Update(n: 0, votes: votes, blanknull: 0, absent: 0, present: 0, totalized: 0, time: 0)
  else:
    for up in el.history:
      yield up
    yield el.lastUpdate

proc updates(el: Eleicao): seq[Update] =
  result = collect(newSeq):
    for up in el.updates: up

proc update(el: Eleicao, up: Update) =
  if el.lastUpdate.votes.len > 0 and el.lastUpdate.n != up.n:
    el.history.add(el.lastUpdate)

  el.lastUpdate = up

proc percentage(update: Update): seq[float] =
  var sum = update.votes.foldl(a + b)
  update.votes.map(v => v / sum * 100)

proc invalid(update: Update): int =
  update.blanknull

proc neededToWin(el: Eleicao, update: Update): int =
  ((el.voters - update.blanknull - update.absent) / 2).floor.int + 1

proc neededToWinOverTime(el: Eleicao): seq[int] =
  el.updates.map(up => el.neededToWin(up))

proc votes(el: Eleicao): seq[seq[int]] =
  for _ in 1..el.candidates:
    result.add(@[])

  for update in el.updates:
    for i, v in enumerate(update.votes):
      result[i].add(v)

proc votesPercentage(el: Eleicao): seq[seq[float]] =
  for _ in 1..el.candidates:
    result.add(@[])

  for update in el.updates:
    for i, p in enumerate(update.percentage):
      result[i].add(p)

proc times(el: Eleicao): seq[int] =
  el.updates.map(up => up.time)

proc invalidVotes(el: Eleicao): seq[int] =
  el.updates.map(up => up.invalid)

proc totalized(el: Eleicao): seq[int] =
  el.updates.map(up => up.totalized)

proc totalizedPercentage(el: Eleicao): seq[float] =
  el.totalized.map(v => v / el.sections * 100)

proc absent(el: Eleicao): seq[int] =
  el.updates.map(up => up.absent)

proc present(el: Eleicao): seq[int] =
  el.updates.map(up => up.present)

proc elPercentage(el: Eleicao): seq[seq[float]] {.exportc.} = el.votesPercentage
proc elCurrentPercentage(el: Eleicao): seq[float] {.exportc.} = el.lastUpdate.percentage
proc elTimes(el: Eleicao): seq[int] {.exportc.} = el.times
proc elInvalidVotes(el: Eleicao): seq[int] {.exportc.} = el.invalidVotes
proc elNeededToWin(el: Eleicao): int {.exportc.} = el.neededToWin(el.lastUpdate)
proc elNeededToWinOverTime(el: Eleicao): seq[int] {.exportc.} = el.neededToWinOverTime
proc elVotes(el: Eleicao): seq[seq[int]] {.exportc.} = el.votes
proc elUpdate(el: Eleicao, update: Update) {.exportc.} = el.update(update)
proc elTotalized(el: Eleicao): seq[int] {.exportc.} = el.totalized
proc elTotalizedPercentage(el: Eleicao): seq[float] {.exportc.} = el.totalizedPercentage
proc elAbsent(el: Eleicao): seq[int] {.exportc.} = el.absent
proc elPresent(el: Eleicao): seq[int] {.exportc.} = el.present
proc elNew(updates: seq[Update], candidates, voters, sections: int): Eleicao {.exportc.} =
  var eleicao = new Eleicao
  eleicao.history = @[]
  eleicao.candidates = candidates
  eleicao.voters = voters
  eleicao.sections = sections
  for update in updates[0..^1]:
    eleicao.update(update)
  result = eleicao
