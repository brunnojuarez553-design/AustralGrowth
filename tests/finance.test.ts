import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { annualProjection, chartSeries, inPeriod, periodBounds, summarize, type FinanceEntry } from '../src/lib/finance/calculations'
const row = (id: string, type: FinanceEntry['type'], amount: number, isPaid = true, date = '2026-11-05T00:00:00.000Z'): FinanceEntry => ({ id, type, amount, isPaid, date, currency: 'USD', category: 'Web', description: id })
const entries = [row('Christian · primera cuota', 'ADVANCE', 500), row('Christian · segundo pago pendiente', 'PENDING', 500, false), row('Ingreso sin cobrar','INCOME',200,false), row('Cobrado','INCOME',300), row('Gasto pagado','EXPENSE',100), row('Gasto pendiente','EXPENSE',50,false)]
test('separates billed, collected, pending, paid expenses and net cash', () => {
  assert.deepEqual(summarize(entries), { billed:1500, collected:800, pending:700, expenses:100, unpaidExpenses:50, netCash:700, margin:87.5 })
})
test('Christian second installment stays pending, including legacy isPaid=true', () => {
  assert.equal(summarize([row('Christian segundo pago','PENDING',500,true)]).collected,0)
  assert.equal(summarize([row('Christian segundo pago','INCOME',500,false)]).pending,500)
})
test('deduplicates only IDs and preserves distinct equal installments and original rows', () => {
  const snapshot=JSON.stringify(entries)
  assert.equal(summarize([...entries,entries[0]]).billed,1500)
  assert.equal(summarize([row('a','INCOME',500),row('b','INCOME',500)]).collected,1000)
  assert.equal(JSON.stringify(entries),snapshot)
})
test('never combines different currencies', () => {
  assert.equal(summarize([...entries,{...row('pesos','INCOME',10000),currency:'ARS'}]).collected,800)
})
test('rounds monetary operations in cents', () => {
  assert.equal(summarize([row('a','INCOME',0.1),row('b','INCOME',0.2)]).collected,0.3)
})
test('exclusive boundaries include last millisecond, leap day and December rollover', () => {
  assert.ok(inPeriod(row('a','INCOME',1,true,'2026-11-30T23:59:59.999Z'),{year:2026,month:11}))
  assert.ok(!inPeriod(row('a','INCOME',1,true,'2026-12-01T00:00:00Z'),{year:2026,month:11}))
  assert.equal(periodBounds({year:2026,month:12}).end.toISOString(),'2027-01-01T00:00:00.000Z')
  assert.ok(inPeriod(row('a','INCOME',1,true,'2024-02-29T00:00:00Z'),{year:2024,month:2}))
  assert.throws(()=>periodBounds({year:2026,month:13}))
  assert.throws(()=>periodBounds({year:NaN}))
})
test('annual projection uses only selected year confirmed collections through today / elapsed months', () => {
  const all=[row('old','INCOME',99999,true,'2025-01-01T00:00:00Z'),row('current','INCOME',1100),row('future','INCOME',99999,true,'2026-12-01T00:00:00Z'),row('pending','PENDING',10000)]
  assert.equal(annualProjection(all,2026,'USD',new Date('2026-11-13T12:00:00Z')),1200)
  assert.equal(annualProjection(all,2025,'USD',new Date('2026-11-13T12:00:00Z')),99999)
  assert.equal(annualProjection(all,2027,'USD',new Date('2026-11-13T12:00:00Z')),null)
  assert.equal(annualProjection([],2026),null)
})
test('daily/monthly chart totals reconcile with selected period cards', () => {
  for(const period of [{year:2026,month:11},{year:2026}]) {
    const series=chartSeries([...entries,row('other year','INCOME',1000,true,'2025-11-05T00:00:00Z')],period,'USD')
    assert.equal(series.reduce((sum,p)=>sum+p.Cobrado,0),800)
    assert.equal(series.reduce((sum,p)=>sum+p.Gastos,0),100)
  }
  assert.equal(chartSeries(entries,{year:2024,month:2},'USD').length,29)
})
