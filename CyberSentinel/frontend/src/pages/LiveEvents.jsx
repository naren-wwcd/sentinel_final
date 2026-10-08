import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pause, Play, BellSimple } from '@phosphor-icons/react'
import { api } from '../services/api'
import { Panel, PageHeader, Async, usePoll, usePageTitle, useParamState, Search, Select, Severity, Time, Empty, Button, Badge, humanize, EVENT_LABEL, EVENT_TONE } from '../components/ui.jsx'
import { eventLabel } from '../components/Shared.jsx'

function Stream({ events, alerts, paused, setPaused }) {
  const [q, setQ] = useParamState('q'); const [type, setType] = useParamState('type', 'ALL')
  const needle = q.toLowerCase()
  const list = events.filter((e) => (type === 'ALL' || e.event_type === type) && (!needle || [e.id, e.username, e.ip, e.asset, e.country, e.event_type].some((x) => String(x).toLowerCase().includes(needle))))
  const types = [...new Set(events.map((e) => e.event_type))]
  return <div className="page">
    <PageHeader title="Events" description="Raw security telemetry as it arrives, alongside the alerts raised by detection rules.">
      <span className="status"><span className={`dot ${paused ? '' : 'ok live'}`} />{paused ? 'Paused' : 'Live'}</span>
      <Button icon={paused ? Play : Pause} onClick={() => setPaused(!paused)}>{paused ? 'Resume' : 'Pause'}</Button>
    </PageHeader>
    <div className="split">
      <div>
        <div className="toolbar">
          <Search value={q} onChange={setQ} placeholder="Search user, IP, asset…" label="Search events" />
          <Select label="Event type" value={type} onChange={setType} options={[['ALL', 'All event types'], ...types.map((t) => [t, EVENT_LABEL[t] || humanize(t)])]} />
          <span className="end count">{list.length} of {events.length}</span>
        </div>
        <Panel flush>{list.length ? <div className="table-wrap"><table>
          <thead><tr><th>Time</th><th>Event</th><th>User</th><th>Asset</th><th>Source</th><th>ID</th></tr></thead>
          <tbody>{list.map((e) => <tr key={e.id}>
            <td className="mono muted nowrap"><Time ts={e.ts} mode="time" /></td>
            <td className="nowrap"><span className="status"><span className={`dot ${EVENT_TONE[e.event_type] || ''}`} />{eventLabel(e.event_type)}</span>{e.details?.size_mb && <> <Badge>{e.details.size_mb} MB</Badge></>}</td>
            <td>{e.username}</td><td>{e.asset}</td>
            <td className="nowrap"><span className="mono">{e.ip}</span> <span className="muted">· {e.country}</span></td>
            <td className="mono muted">{e.id}</td></tr>)}</tbody></table></div>
          : <Empty title="No events match" action={<Button onClick={() => { setQ(''); setType('ALL') }}>Clear filters</Button>} />}</Panel>
      </div>
      <Panel flush title="Alerts" hint={alerts ? `${alerts.length} raised` : undefined} className="sticky-rail">
        {alerts?.length ? <ul className="item-list panel-scroll" style={{ maxHeight: 'calc(100vh - 180px)' }}>{alerts.map((a) => <li key={a.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}><Severity level={a.severity} /><span className="muted mono" style={{ fontSize: 12 }}><Time ts={a.ts} mode="time" /></span></div>
          <div style={{ fontWeight: 600, margin: '8px 0 2px' }}>{humanize(a.type)}</div>
          <div className="dim" style={{ fontSize: 13 }}>{a.description}</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}><span className="mono">{a.id}</span> · trigger <span className="mono">{a.event_id}</span>{a.incident_id && <> · <Link className="link mono" to={`/incidents/${a.incident_id}`}>{a.incident_id}</Link></>}</div>
        </li>)}</ul> : <Empty compact icon={BellSimple} title="No alerts">Nothing has tripped a detection rule.</Empty>}
      </Panel>
    </div>
  </div>
}

export default function LiveEvents() {
  usePageTitle('Events')
  const [paused, setPaused] = useState(false)
  const ev = usePoll(() => api.events(300), paused ? 0 : 1500); const al = usePoll(api.alerts, paused ? 0 : 1500)
  return <Async state={ev}>{(events) => <Stream events={events} alerts={al.data} paused={paused} setPaused={setPaused} />}</Async>
}
