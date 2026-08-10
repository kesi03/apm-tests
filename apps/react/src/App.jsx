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
