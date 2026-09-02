import { Component, useState } from 'react'
import { context, trace, SpanStatusCode } from '@opentelemetry/api'

const tracer = trace.getTracer('react-app')

const BACKENDS = [
  { name: 'java', label: 'Java' },
  { name: 'spring-boot', label: 'Spring Boot' },
  { name: 'openliberty', label: 'Open Liberty' },
  { name: 'expressjs', label: 'Express.js' },
  { name: 'python', label: 'Python' },
  { name: 'csharp', label: 'C#' },
  { name: 'golang', label: 'Go' }
]

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    const span = tracer.startSpan('error-boundary')
    span.recordException(error)
    span.setStatus({ code: SpanStatusCode.ERROR })
    span.end()
  }

  render() {
    if (this.state.hasError) {
      return (
        <main>
          <h1>React + Elastic APM RUM</h1>
          <p>Error caught by the error boundary and reported to APM.</p>
        </main>
      )
    }
    return this.props.children
  }
}

function randomHex(bytes) {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

function StartChain() {
  const [status, setStatus] = useState('')

  const start = async () => {
    setStatus('')
    const traceId = randomHex(16) // 32 hex chars
    const rootSpan = randomHex(8) // 16 hex chars
    const traceparent = `00-${traceId}-${rootSpan}-01`

    // Build chain members in deterministic order the backend handlers expect
    const members = [
      { name: 'react', id: crypto.randomUUID(), url: window.location.origin + '/chain', completed: true },
      { name: 'expressjs', id: crypto.randomUUID(), url: 'http://expressjs-app.elastic-stack.svc.cluster.local:3000/chain', completed: false },
      { name: 'java', id: crypto.randomUUID(), url: 'http://java-app.elastic-stack.svc.cluster.local:8080/chain', completed: false },
      { name: 'springboot', id: crypto.randomUUID(), url: 'http://spring-boot-app.elastic-stack.svc.cluster.local:8080/chain', completed: false },
      { name: 'openliberty', id: crypto.randomUUID(), url: 'http://openliberty-app.elastic-stack.svc.cluster.local:9080/chain', completed: false },
      { name: 'golang', id: crypto.randomUUID(), url: 'http://golang-app.elastic-stack.svc.cluster.local:8080/chain', completed: false },
      { name: 'csharp', id: crypto.randomUUID(), url: 'http://csharp-app.elastic-stack.svc.cluster.local:5000/chain', completed: false },
      { name: 'python', id: crypto.randomUUID(), url: 'http://python-app.elastic-stack.svc.cluster.local:5000/chain', completed: false }
    ]

    const chainEvent = {
      event: 'chain',
      transaction: { id: traceId, rootSpan: rootSpan },
      chain: { members },
      timestamp: new Date().toISOString()
    }

    // create a local span for react step
    const span = tracer.startSpan('react-chain-step')
    try {
      const res = await fetch('/proxy/expressjs/chain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'traceparent': traceparent
        },
        body: JSON.stringify(chainEvent)
      })

      if (!res.ok) throw new Error(`status ${res.status}`)
      setStatus('Chain started')
    } catch (err) {
      setStatus(`Error: ${String(err)}`)
    } finally {
      span.end()
    }
  }

  return (
    <section>
      <h2>Start deterministic chain</h2>
      <p>Creates a W3C traceparent and forwards the unified chain to Express.js.</p>
      <button onClick={start}>Start chain</button>
      {status && <div>{status}</div>}
    </section>
  )
}

function SendTransaction() {
  const [message, setMessage] = useState('')
  const handleClick = () => {
    setMessage('')
    const parent = tracer.startSpan('button-click')
    const span = tracer.startSpan('do-some-work', undefined, trace.setSpan(context.active(), parent))
    setTimeout(() => {
      span.end()
      parent.end()
      setMessage('Custom transaction sent to APM Server')
    }, 300)
  }
  return (
    <div>
      <button onClick={handleClick}>Send custom transaction</button>
      {message && <p>{message}</p>}
    </div>
  )
}

function ThrowError() {
  throw new Error('Boom from RUM demo')
}

function ProxyCalls() {
  const [results, setResults] = useState({})
  const [pending, setPending] = useState(null)

  const callBackend = async (name) => {
    setPending(name)
    const span = tracer.startSpan(`proxy-call-${name}`)
    try {
      const res = await fetch(`/proxy/${name}/`, { headers: { Accept: 'text/plain' } })
      const text = await res.text()
      setResults((prev) => ({ ...prev, [name]: { status: res.status, text } }))
    } catch (err) {
      setResults((prev) => ({ ...prev, [name]: { status: 'ERR', text: String(err) } }))
    } finally {
      span.end()
      setPending(null)
    }
  }

  return (
    <section>
      <h2>Call backend apps</h2>
      <p>Each request is proxied through this server, so the trace continues into the backend app.</p>
      <ul>
        {BACKENDS.map((backend) => (
          <li key={backend.name}>
            <button onClick={() => callBackend(backend.name)} disabled={pending === backend.name}>
              Call {backend.label}
            </button>
            {results[backend.name] && (
              <span data-testid={`proxy-${backend.name}`}>
                {results[backend.name].status} {results[backend.name].text}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function App() {
  const [showError, setShowError] = useState(false)
  return (
    <ErrorBoundary>
      <main>
        <h1>React + Elastic APM RUM</h1>
        <p>This page is instrumented with the EDOT Browser (OpenTelemetry RUM) agent.</p>
        <StartChain />
        <SendTransaction />
        <ProxyCalls />
        {showError ? (
          <ThrowError />
        ) : (
          <div>
            <button onClick={() => setShowError(true)}>Throw an error</button>
          </div>
        )}
      </main>
    </ErrorBoundary>
  )
}
