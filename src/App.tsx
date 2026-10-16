import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MapPin,
  Menu,
  Phone,
  Plus,
  Save,
  Scissors,
  X,
  Trash2,
} from 'lucide-react'
import { supabase, supabaseConfigured } from './lib/supabase'
import './App.css'

type ShopService = {
  id: string
  name: string
  description: string
  duration_min: number
  price: number
  priceLabel?: string
  active: boolean
}

type Barber = {
  id: string
  name: string
  active: boolean
}

type ShopSettings = {
  id: number
  open_time: string
  close_time: string
  closed_days: number[]
  whatsapp: string
  address: string
}

type Appointment = {
  id: string
  appointment_date: string
  start_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  customer_name: string
  customer_phone: string
  services: { name: string; price: number } | null
  barbers: { name: string } | null
}

type BookingDraft = {
  serviceId: string
  barberId: string
  date: string
  time: string
  name: string
  phone: string
}

const previewServices: ShopService[] = [
  {
    "id": "corte",
    "name": "Corte",
    "description": "Do clássico ao degradê, com o seu estilo.",
    "duration_min": 40,
    "price": 40,
    "active": true,
    "priceLabel": "A partir de R$ 40"
  },
  {
    "id": "barba",
    "name": "Barba",
    "description": "Acabamento e cuidado com a sua barba.",
    "duration_min": 40,
    "price": 35,
    "active": true
  },
  {
    "id": "combo",
    "name": "Cabelo/Barba",
    "description": "Cabelo e barba no mesmo atendimento.",
    "duration_min": 60,
    "price": 70,
    "active": true
  },
  {
    "id": "infantil",
    "name": "Corte infantil até 5 anos",
    "description": "Cuidado e atenção para os pequenos.",
    "duration_min": 40,
    "price": 50,
    "active": true
  },
  {
    "id": "barboterapia",
    "name": "Barboterapia",
    "description": "Um tempo a mais para cuidar de você.",
    "duration_min": 40,
    "price": 80,
    "active": true
  },
  {
    "id": "pente",
    "name": "Pente único",
    "description": "Praticidade, com acabamento no detalhe.",
    "duration_min": 20,
    "price": 30,
    "active": true
  },
  {
    "id": "hidratacao",
    "name": "Hidratação",
    "description": "Cuidado para renovar os fios.",
    "duration_min": 20,
    "price": 0,
    "active": true,
    "priceLabel": "Consultar"
  },
  {
    "id": "higiene",
    "name": "Higienização ouvido/nariz",
    "description": "Cuidado nos pequenos detalhes.",
    "duration_min": 20,
    "price": 20,
    "active": true,
    "priceLabel": "A partir de R$ 20"
  },
  {
    "id": "pezinho",
    "name": "Pézinho",
    "description": "O acabamento que faz a diferença.",
    "duration_min": 20,
    "price": 0,
    "active": true,
    "priceLabel": "Consultar"
  },
  {
    "id": "luzes",
    "name": "Platinado/Luzes",
    "description": "Uma nova versão do seu visual.",
    "duration_min": 40,
    "price": 150,
    "active": true,
    "priceLabel": "A partir de R$ 150"
  },
  {
    "id": "selagem",
    "name": "Selagem",
    "description": "Mais cuidado para os seus fios.",
    "duration_min": 30,
    "price": 50,
    "active": true,
    "priceLabel": "A partir de R$ 50"
  },
  {
    "id": "sobrancelha",
    "name": "Sobrancelha",
    "description": "Definição e acabamento.",
    "duration_min": 20,
    "price": 0,
    "active": true,
    "priceLabel": "Consultar"
  }
]

const team = [{name: "André", photo: "/andre.jpg"}, {name: "Marcos", photo: "/marcos.jpg"}, {name: "Natã", photo: "/nata.jpg"}]
const mapsUrl = "https://www.google.com/maps/place/Barbearia+Nat%C3%A3+Garcia+%7C+Rio+das+Ostras/data=!4m2!3m1!1s0x0:0xd4a083d94b240b65"
const shopAddress = "Av. Alcebiades Sabino dos Santos, 353"

const gallery = [{"image": "/galeria-corte-barba.jpg", "title": "Corte e barba", "url": "https://www.instagram.com/barbearianata/reel/DTdSNyYEfyp/"}, {"image": "/galeria-coloracao.jpg", "title": "Coloração", "url": "https://www.instagram.com/_nataagarcia/reel/DUGx9H8EdNk/"}, {"image": "/galeria-infantil.jpg", "title": "Atendimento infantil", "url": "https://www.instagram.com/ceinovacao/reel/DWZGy9lRnTa/"}, {"image": "/galeria-acabamento.jpg", "title": "Acabamento no detalhe", "url": "https://www.instagram.com/_nataagarcia/reel/DXct78NkT2W/"}]

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const currentYear = new Date().getFullYear()
const statusLabels: Record<Appointment['status'], string> = {
  pending: 'Aguardando',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

function localDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) {
  return new Intl.DateTimeFormat('pt-BR', options).format(new Date(`${value}T12:00:00`))
}

function formatTime(value: string) {
  return value.slice(0, 5)
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

function App() {
  const [services, setServices] = useState<ShopService[]>(previewServices)
  const [barbers, setBarbers] = useState<Barber[]>(team.map(person => ({ id: person.name, name: person.name, active: true })))
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [dataError, setDataError] = useState('')
  const [loading, setLoading] = useState(Boolean(supabase))
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingBarberId, setBookingBarberId] = useState('')
  const [adminOpen, setAdminOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [session, setSession] = useState<Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']>(null)
  const [sessionLoading, setSessionLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return

    let mounted = true
    Promise.all([
      supabase.from('services').select('*').eq('active', true).order('price'),
      supabase.from('barbers').select('id, name, active').eq('active', true).order('name'),
      supabase.from('shop_settings').select('*').eq('id', 1).maybeSingle(),
    ]).then(([serviceResult, barberResult, settingsResult]) => {
      if (!mounted) return
      const errors = [serviceResult.error, barberResult.error, settingsResult.error].filter(Boolean)
      if (errors.length) {
        setServices([])
        setBarbers([])
        setSettings(null)
        setDataError('Não foi possível carregar os dados da barbearia. Tente atualizar a página.')
      } else {
        setServices((serviceResult.data ?? []) as ShopService[])
        setBarbers((barberResult.data ?? []) as Barber[])
        setSettings(settingsResult.data as ShopSettings | null)
      }
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setSessionLoading(false)
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setDataError('Não foi possível verificar sua sessão. Tente novamente.')
      setSession(data.session)
      setSessionLoading(false)
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const openBooking = () => {
    setBookingBarberId('')
    setBookingOpen(true)
  }
  const bookWithBarber = (name: string) => {
    const barber = barbers.find(person => person.name === name || person.name.startsWith(`${name} `))
    setBookingBarberId(barber?.id ?? '')
    setBookingOpen(true)
  }
  const publicView = () => {
    setAdminOpen(false)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {adminOpen ? (
        sessionLoading ? (
          <div className="screen-loader"><LoaderCircle className="spin" size={22} /> Carregando sua sessão</div>
        ) : session ? (
          <OwnerPanel
            onBack={publicView}
            onLogout={async () => {
              if (!supabase) return false
              const { error } = await supabase.auth.signOut()
              if (error) return false
              setSession(null)
              setAdminOpen(false)
              return true
            }}
          />
        ) : (
          <LoginScreen onBack={publicView} onLogin={setSession} />
        )
      ) : (
        <main>
          <header className="site-header">
            <a className="brand" href="#" onClick={(event) => { event.preventDefault(); publicView() }} aria-label="Barbearia do Natã Garcia, início">
              <img className="brand-logo" src="/logo-nata.png" alt="Logo Natã Garcia" />
              <span className="brand-name">NATÃ GARCIA<span>BARBEARIA</span></span>
            </a>
            <button className="menu-toggle" aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
            <nav className={mobileMenuOpen ? 'main-nav is-open' : 'main-nav'}>
              <a href="#servicos" onClick={() => setMobileMenuOpen(false)}>Serviços</a>
              <a href="#equipe" onClick={() => setMobileMenuOpen(false)}>Equipe</a>
              <a href="#galeria" onClick={() => setMobileMenuOpen(false)}>Galeria</a>
              <a href="#sobre" onClick={() => setMobileMenuOpen(false)}>A barbearia</a>
              <a href="#visite" onClick={() => setMobileMenuOpen(false)}>Como chegar</a>
              <button className="nav-owner" onClick={() => { setAdminOpen(true); setMobileMenuOpen(false) }}>
                <LockKeyhole size={14} /> Área do dono
              </button>
              <button className="button button-dark nav-book" onClick={openBooking}>Agendar horário <ArrowUpRight size={16} /></button>
            </nav>
          </header>

          <section className="hero">
            <div className="hero-photo" role="img" aria-label="Equipe da Barbearia Natã Garcia em frente à fachada" />
            <div className="hero-content">
              <p className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> Atlântica / Rio das Ostras</p>
              <h1>Seu estilo.<br />Nossa <em>assinatura.</em></h1>
              <p className="hero-copy">Corte alinhado, barba no detalhe e uma equipe que entende do seu estilo. Chega mais, a casa é sua.</p>
              <a className="button button-clay hero-cta" href="#equipe">Escolher meu horário <ArrowRight size={16} /></a>
              <div className="hero-note"><span className="hero-note-line" /> UMA BARBEARIA DO BAIRRO, FEITA PRA VOCÊ</div>
            </div>
            <div className="hero-side-label">BARBEARIA DO NATÃ GARCIA <span>·</span> CORTE · BARBA · ESTILO</div>
            <a href="#servicos" className="hero-scroll" aria-label="Ver serviços"><ArrowDownRight size={20} /></a>
          </section>

          <section className="intro-strip">
            <div className="strip-item"><span className="strip-number">01</span><span>Um atendimento<br />sem correria.</span></div>
            <div className="strip-divider" />
            <div className="strip-item"><span className="strip-number">02</span><span>O corte certo<br />pra você.</span></div>
            <div className="strip-divider" />
            <div className="strip-item"><span className="strip-number">03</span><span>No coração<br />do Atlântica.</span></div>
            <p className="strip-signature">Chega mais.<br /><em>Seu próximo corte é aqui.</em></p>
          </section>

          <section className="services-section section-wrap" id="servicos">
            <div className="section-heading">
              <div>
                <p className="eyebrow"><span className="eyebrow-dot" /> Serviços e valores</p>
                <h2>Um bom corte<br /><em>muda o dia.</em></h2>
              </div>
              <div className="section-aside">
                <p>Escolha o que combina com você. A gente cuida do resto.</p>
                <span><Clock3 size={14} /> Atendimento com hora marcada</span>
              </div>
            </div>
            {dataError && <p className="inline-notice" role="status">{dataError}</p>}
            
            {loading && supabaseConfigured ? (
              <div className="services-loading"><LoaderCircle className="spin" size={18} /> Carregando serviços...</div>
            ) : (
              <div className="service-list">
                {services.map((service, index) => (
                  <article className="service-card" key={service.id}>
                    <div className="service-index">{String(index + 1).padStart(2, "0")}</div>
                    <div className="service-main">
                      <h3>{service.name}</h3>
                      <p>{service.description}</p>
                    </div>
                    <span className="service-duration">{service.duration_min} min</span>
                    <div className="service-price">{service.priceLabel || money(service.price)}</div>
                    <button className="service-arrow" onClick={openBooking} aria-label={`Agendar ${service.name}`}><ArrowUpRight size={17} /></button>
                  </article>
                ))}
              </div>
            )}
            <div className="services-footnote"><Scissors size={15} /> Valores sujeitos a confirmação. Serviços indicados como “a partir de” podem variar conforme o atendimento.</div>
          </section>

          <section className="team-section section-wrap" id="equipe">
            <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-dot" /> Nossos barbeiros</p><h2>Seu próximo corte.<br /><em>Em boas mãos.</em></h2></div><p className="team-intro">Conheça os profissionais da casa e escolha com quem marcar seu horário.</p></div>
            <div className="team-grid">{team.map(person => <article className="team-card" key={person.name}><button className="team-portrait" onClick={() => bookWithBarber(person.name)} aria-label={'Agendar com ' + person.name}><img src={person.photo} alt={person.name + ', barbeiro'} loading="lazy" /><span className="team-book-label">Agendar com {person.name}</span></button><div className="team-info"><div><h3>{person.name}</h3><p>BARBEIRO</p></div><button className="service-arrow" onClick={() => bookWithBarber(person.name)} aria-label={'Ver agenda de ' + person.name}><ArrowUpRight size={20} /></button></div></article>)}</div>
          </section>

          <WorkGallery />

          <section className="about-section" id="sobre">
            <div className="about-image" role="img" aria-label="Equipe reunida em frente à Barbearia Natã Garcia" />
            <div className="about-copy">
              <p className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> A barbearia</p>
              <h2>A equipe é nossa.<br />O estilo é <em>seu.</em></h2>
              <p>Na Barbearia do Natã Garcia, cada atendimento tem seu tempo. Sem pressa, sem complicação — só um bom trabalho e aquele cuidado que faz diferença.</p>
              <div className="about-location"><MapPin size={17} /><span>Atlântica<br /><strong>Rio das Ostras · RJ</strong></span></div>
              <a className="text-link text-link-light" href="https://www.instagram.com/p/DXHdG-ZASHR/" target="_blank" rel="noreferrer">Conheça a equipe no Instagram <Instagram size={16} /></a>
            </div>
            <span className="about-caption">UM ESPAÇO PRA PAUSAR E SE CUIDAR</span>
          </section>

          <section className="visit-section section-wrap" id="visite">
            <div className="visit-head">
              <div>
                <p className="eyebrow"><span className="eyebrow-dot" /> Endereço e horários</p>
                <h2>Seu lugar no<br /><em>Atlântica.</em></h2>
              </div>
              <a className="map-card" href={mapsUrl} target="_blank" rel="noreferrer">
                <MapPin size={21} />
                <span>{settings?.address || shopAddress}<small>Atlantica · Rio das Ostras/RJ · 28890-000</small></span>
                <ArrowUpRight size={17} />
              </a>
            </div>
            <iframe className="location-map" title="Localização da Barbearia Natã Garcia no Google Maps" src="https://maps.google.com/maps?q=Barbearia%20Nat%C3%A3%20Garcia%2C%20Av.%20Alcebiades%20Sabino%20dos%20Santos%20353%2C%20Rio%20das%20Ostras&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            <div className="visit-bottom">
              <p>Passa pra tomar um café. Fica pra fazer o corte.</p>
              <div className="visit-hours"><Clock3 size={16} /><span>Seg a sex · 09h às 19h30<small>Sábado · 09h às 17h</small><small>Domingo · 09h às 13h</small></span></div>
              <button className="button button-dark" onClick={openBooking}>Reservar meu horário <ArrowRight size={16} /></button>
            </div>
          </section>

          <footer className="site-footer">
            <a className="brand footer-brand" href="#" onClick={(event) => { event.preventDefault(); publicView() }}>
              <img className="brand-logo" src="/logo-nata.png" alt="Logo Natã Garcia" />
              <span className="brand-name">NATÃ GARCIA<span>BARBEARIA</span></span>
            </a>
            <span className="footer-place">ATLÂNTICA · RIO DAS OSTRAS · RJ</span>
            <div className="footer-links">
              {<a href={`https://wa.me/${(settings?.whatsapp || "5521982464611").replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><Phone size={15} /> WhatsApp</a>}
              <a href="https://www.instagram.com/barbearianata/" target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={14} /></a>
              <button onClick={() => setAdminOpen(true)}>Área do dono <ArrowUpRight size={14} /></button>
            </div>
            <span className="footer-copy">© {currentYear} Barbearia do Natã Garcia</span>
          </footer>
        </main>
      )}

      {bookingOpen && (
        <BookingModal
          services={services}
          initialBarberId={bookingBarberId}
          barbers={barbers}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </>
  )
}

function Instagram({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
}

function WorkGallery() {
  return <section className="gallery-section section-wrap" id="galeria" aria-label="Galeria de trabalhos">
    <div className="section-heading"><div><p className="eyebrow">Galeria</p><h2>O trabalho<br /><em>fala por si.</em></h2></div><div className="gallery-aside"><p>Um pouco do que acontece nas cadeiras da casa.</p><a className="text-link instagram-pill" href="https://www.instagram.com/barbearianata/" target="_blank" rel="noreferrer"><Instagram size={16} /> @barbearianata</a></div></div>
    <div className="gallery-grid">{gallery.map(item => <article className="gallery-item" key={item.image}><a className="gallery-photo" href={item.url} target="_blank" rel="noreferrer" aria-label={item.title + ' — ver publicação no Instagram'}><img src={item.image} alt={item.title + ' na Barbearia Natã Garcia'} loading="lazy" /></a><div className="gallery-caption"><h3>{item.title}</h3><a className="instagram-pill" href={item.url} target="_blank" rel="noreferrer"><Instagram size={15} /> Ver no Instagram</a></div></article>)}</div>
  </section>
}

function BookingModal({ services, barbers, initialBarberId, onClose }: { services: ShopService[]; barbers: Barber[]; initialBarberId: string; onClose: () => void }) {
  const [draft, setDraft] = useState<BookingDraft>({ serviceId: '', barberId: initialBarberId, date: localDate(), time: '', name: '', phone: '' })
  const [step, setStep] = useState(1)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const today = localDate()

  const selectedService = services.find((service) => service.id === draft.serviceId)
  const selectedBarber = barbers.find((barber) => barber.id === draft.barberId)

  useEffect(() => {
    if (step !== 2 || !draft.serviceId || !draft.barberId || !draft.date || !supabase) return
    let mounted = true
    supabase.rpc('available_slots', {
      p_barber_id: draft.barberId,
      p_service_id: draft.serviceId,
      p_date: draft.date,
    }).then(({ data, error: slotError }) => {
      if (!mounted) return
      if (slotError) setError('Não foi possível consultar a agenda. Tente novamente.')
      else setSlots(((data ?? []) as { slot: string }[]).map((item) => item.slot))
      setLoadingSlots(false)
    })
    return () => { mounted = false }
  }, [step, draft.serviceId, draft.barberId, draft.date])

  const select = (key: keyof BookingDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      setError('O agendamento online está sendo configurado. Volte em breve ou entre em contato com a barbearia.')
      return
    }
    if (draft.name.trim().length < 2 || draft.phone.replace(/\D/g, '').length < 10) {
      setError('Confira seu nome e informe um telefone com DDD.')
      return
    }
    setSubmitting(true)
    setError('')
    const { error: bookingError } = await supabase.rpc('create_booking', {
      p_service_id: draft.serviceId,
      p_barber_id: draft.barberId,
      p_appointment_date: draft.date,
      p_start_time: draft.time,
      p_customer_name: draft.name.trim(),
      p_customer_phone: draft.phone.trim(),
    })
    setSubmitting(false)
    if (bookingError) {
      setError(bookingError.message.includes('indisponível') ? 'Esse horário acabou de ser reservado. Escolha outro, por favor.' : 'Não foi possível concluir o agendamento. Tente novamente.')
      if (bookingError.message.includes('indisponível')) setStep(2)
      return
    }
    setComplete(true)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        {complete ? (
          <div className="booking-success">
            <span className="success-icon"><Check size={24} /></span>
            <p className="eyebrow"><span className="eyebrow-dot" /> Reserva recebida</p>
            <h2 id="booking-title">Tá marcado,<br /><em>{draft.name.split(' ')[0]}.</em></h2>
            <p>Seu pedido de horário foi registrado. A gente te espera na Barbearia do Natã Garcia.</p>
            <div className="confirmation-card"><strong>{selectedService?.name}</strong><span>{formatDate(draft.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(draft.time)}</span><span>{selectedBarber?.name} · {money(selectedService?.price ?? 0)}</span></div>
            <button className="button button-dark" onClick={onClose}>Fechar <ArrowRight size={16} /></button>
          </div>
        ) : (
          <>
            <div className="booking-heading">
              <p className="eyebrow"><span className="eyebrow-dot" /> Agendamento</p>
              <h2 id="booking-title">{step === 3 ? 'Só falta ' : 'Um bom horário, '}<em>{step === 3 ? 'confirmar.' : 'é seu.'}</em></h2>
              <div className="booking-progress"><span className={step >= 1 ? 'current' : ''}>01</span><i /><span className={step >= 2 ? 'current' : ''}>02</span><i /><span className={step >= 3 ? 'current' : ''}>03</span></div>
            </div>
            {step === 1 && (
              <div className="booking-step">
                <label className="field-label">O que vamos fazer?</label>
                <div className="booking-options">
                  {services.map((service) => (
                    <button key={service.id} className={`booking-option ${draft.serviceId === service.id ? 'selected' : ''}`} onClick={() => select('serviceId', service.id)}>
                      <span><strong>{service.name}</strong><small>{service.duration_min} min · {service.description}</small></span>
                      <b>{service.priceLabel || money(service.price)}</b>
                    </button>
                  ))}
                </div>
                {barbers.length > 1 && (
                  <>
                    <label className="field-label" htmlFor="barber">Com quem?</label>
                    <select id="barber" value={draft.barberId} onChange={(event) => select('barberId', event.target.value)}>
                      <option value="">Escolha um profissional</option>
                      {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
                    </select>
                  </>
                )}
                {barbers.length === 1 && <p className="selected-barber"><Scissors size={15} /> Com {barbers[0].name}</p>}
                <button className="button button-dark booking-next" disabled={!draft.serviceId || !draft.barberId && barbers.length !== 1} onClick={() => {
                  if (barbers.length === 1) select('barberId', barbers[0].id)
                  setLoadingSlots(Boolean(supabase))
                  setSlots([])
                  setError('')
                  setStep(2)
                }}>Escolher dia e hora <ArrowRight size={16} /></button>
              </div>
            )}
            {step === 2 && (
              <div className="booking-step">
                <label className="field-label" htmlFor="booking-date">Qual dia fica melhor?</label>
                <input id="booking-date" type="date" min={today} value={draft.date} onChange={(event) => { select('date', event.target.value); select('time', ''); setLoadingSlots(Boolean(supabase)); setSlots([]); setError('') }} />
                <label className="field-label">Horários disponíveis</label>
                {loadingSlots ? <div className="slots-loading"><LoaderCircle size={17} className="spin" /> Consultando horários...</div> :
                  slots.length > 0 ? <div className="slot-grid">{slots.map((slot) => <button className={draft.time === slot ? 'slot selected' : 'slot'} key={slot} onClick={() => select('time', slot)}>{formatTime(slot)}</button>)}</div> :
                    <p className="empty-slots">{!supabaseConfigured ? 'A agenda ainda não está conectada. A consulta de horários e a confirmação de reservas serão liberadas após a configuração.' : error || 'Não há horários livres para este dia. Tente outra data.'}</p>}
                <div className="step-actions"><button className="button button-quiet" onClick={() => setStep(1)}><ArrowLeft size={16} /> Voltar</button><button className="button button-dark" disabled={!draft.time} onClick={() => setStep(3)}>Continuar <ArrowRight size={16} /></button></div>
              </div>
            )}
            {step === 3 && (
              <form className="booking-step" onSubmit={submit}>
                <div className="booking-summary"><span><CalendarDays size={16} /> {formatDate(draft.date)} · {formatTime(draft.time)}</span><span><Scissors size={16} /> {selectedService?.name} · {money(selectedService?.price ?? 0)}</span></div>
                <label className="field-label" htmlFor="customer-name">Como podemos te chamar?</label>
                <input id="customer-name" autoComplete="name" required minLength={2} value={draft.name} onChange={(event) => select('name', event.target.value)} placeholder="Seu nome" />
                <label className="field-label" htmlFor="customer-phone">Seu WhatsApp</label>
                <input id="customer-phone" type="tel" autoComplete="tel" required value={draft.phone} onChange={(event) => select('phone', event.target.value)} placeholder="(22) 99999-9999" />
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="step-actions"><button className="button button-quiet" type="button" onClick={() => setStep(2)}><ArrowLeft size={16} /> Voltar</button><button className="button button-dark" disabled={submitting} type="submit">{submitting ? <><LoaderCircle size={16} className="spin" /> Salvando...</> : <>Confirmar horário <Check size={16} /></>}</button></div>
                <p className="privacy-note">Seus dados são usados apenas para organizar seu atendimento.</p>
              </form>
            )}
          </>
        )}
        {!complete && error && step !== 3 && <p className="form-error modal-error" role="alert">{error}</p>}
      </section>
    </div>
  )
}

function LoginScreen({ onBack, onLogin }: { onBack: () => void; onLogin: (session: NonNullable<Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']>) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      setError('O painel ainda está sendo configurado. Conecte o projeto ao Supabase para liberar o acesso.')
      return
    }
    setBusy(true)
    setError('')
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (loginError || !data.session) {
      setError('E-mail ou senha incorretos. Confira os dados e tente novamente.')
      return
    }
    onLogin(data.session)
  }

  return (
    <main className="admin-shell">
      <div className="admin-topbar"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Voltar ao site</button><a className="brand" href="#"><span className="brand-mark"><Scissors size={18} /></span><span className="brand-name">NATÃ GARCIA<span>BARBEARIA</span></span></a><span className="admin-top-label">PAINEL DO PROPRIETÁRIO</span></div>
      <div className="login-wrap">
        <div className="login-aside"><p className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> Bem-vindo de volta</p><h1>A casa<br />é sua,<br /><em>Natã.</em></h1><p>Entre para cuidar da agenda e deixar tudo em ordem.</p></div>
        <form className="login-card" onSubmit={submit}>
          <span className="login-icon"><LockKeyhole size={19} /></span>
          <p className="eyebrow"><span className="eyebrow-dot" /> Acesso do proprietário</p>
          <h2>Entrar no painel</h2>
          {!supabaseConfigured && <p className="login-setup-note">Conecte o Supabase para liberar o acesso do proprietário.</p>}
          <label className="field-label" htmlFor="owner-email">E-mail</label>
          <input id="owner-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" />
          <label className="field-label" htmlFor="owner-password">Senha</label>
          <input id="owner-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-dark login-submit" disabled={busy} type="submit">{busy ? <><LoaderCircle size={16} className="spin" /> Entrando...</> : <>Entrar <ArrowRight size={16} /></>}</button>
          <p className="login-help">Acesso exclusivo do proprietário da barbearia.</p>
        </form>
      </div>
    </main>
  )
}

function OwnerPanel({ onBack, onLogout }: { onBack: () => void; onLogout: () => Promise<boolean> }) {
  const [authorized, setAuthorized] = useState(false)
  const [accessLoading, setAccessLoading] = useState(Boolean(supabase))
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<ShopService[]>([])
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [tab, setTab] = useState<'agenda' | 'services' | 'settings'>('agenda')
  const [selectedDate, setSelectedDate] = useState(localDate())
  const [showCancelled, setShowCancelled] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [notice, setNotice] = useState('')
  const [serviceDraft, setServiceDraft] = useState({ name: '', description: '', duration_min: 30, price: 0 })
  const [savingSettings, setSavingSettings] = useState(false)
  const todayAppointments = useMemo(() => appointments.filter((item) => item.appointment_date === localDate()), [appointments])
  const pendingCount = todayAppointments.filter((item) => item.status === 'pending').length
  const revenue = todayAppointments.filter((item) => item.status === 'completed').reduce((sum, item) => sum + (item.services?.price ?? 0), 0)

  const loadDashboard = async () => {
    if (!supabase) return
    const [appointmentResult, serviceResult, settingsResult] = await Promise.all([
      supabase.from('appointments').select('id, appointment_date, start_time, status, customer_name, customer_phone, services(name, price), barbers(name)').order('appointment_date').order('start_time'),
      supabase.from('services').select('*').order('price'),
      supabase.from('shop_settings').select('*').eq('id', 1).maybeSingle(),
    ])
    if (appointmentResult.error || serviceResult.error || settingsResult.error) {
      setNotice('Não foi possível carregar todos os dados. Atualize a página e tente novamente.')
      return
    }
    setAppointments((appointmentResult.data ?? []) as unknown as Appointment[])
    setServices((serviceResult.data ?? []) as ShopService[])
    setSettings(settingsResult.data as ShopSettings | null)
  }

  useEffect(() => {
    const client = supabase
    if (!client) return
    let mounted = true
    client.auth.getUser().then(async ({ data, error }) => {
      if (!mounted) return
      if (error || !data.user) {
        setAccessLoading(false)
        return
      }
      const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('user_id', data.user.id).maybeSingle()
      if (!mounted) return
      if (profileError || profile?.role !== 'owner') {
        setNotice('Esta conta não tem permissão de proprietário. Use a conta cadastrada para o painel.')
        setAccessLoading(false)
        return
      }
      setAuthorized(true)
      setAccessLoading(false)
      void loadDashboard()
    })
    return () => { mounted = false }
  }, [])

  const updateStatus = async (id: string, status: Appointment['status']) => {
    if (!supabase) return
    setBusyId(id)
    setNotice('')
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (error) setNotice('Não foi possível atualizar o agendamento. Tente novamente.')
    else {
      setAppointments((current) => current.map((appointment) => appointment.id === id ? { ...appointment, status } : appointment))
      setNotice('Agendamento atualizado.')
    }
    setBusyId('')
  }

  const deleteAppointment = async (appointment: Appointment) => {
    if (!supabase) return
    if (!window.confirm(`Excluir o agendamento de ${appointment.customer_name}, em ${formatDate(appointment.appointment_date)} às ${formatTime(appointment.start_time)}? Esta ação não pode ser desfeita.`)) return
    setBusyId(appointment.id)
    setNotice('')
    const { data, error } = await supabase.from('appointments').delete().eq('id', appointment.id).select('id')
    if (error || !data?.length) {
      setNotice(error ? `Não foi possível excluir: ${error.message} (código ${error.code}).` : 'A exclusão não foi autorizada pelo banco. Reinstale a regra de exclusão do proprietário no Supabase e entre novamente no painel.')
    } else {
      setAppointments(current => current.filter(item => item.id !== appointment.id))
      setNotice('Agendamento excluído.')
    }
    setBusyId('')
  }

  const updateService = async (service: ShopService) => {
    if (!supabase) return
    setBusyId(service.id)
    setNotice('')
    const { error } = await supabase.from('services').update({
      name: service.name,
      description: service.description,
      duration_min: service.duration_min,
      price: service.price,
      active: service.active,
    }).eq('id', service.id)
    if (error) setNotice('Não foi possível salvar este serviço. Confira os dados e tente novamente.')
    else setNotice(`${service.name} atualizado.`)
    setBusyId('')
  }

  const createService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setBusyId('new')
    setNotice('')
    const { data, error } = await supabase.from('services').insert(serviceDraft).select('*').single()
    if (error) setNotice('Não foi possível adicionar o serviço. Confira os dados e tente novamente.')
    else {
      setServices((current) => [...current, data as ShopService].sort((a, b) => a.price - b.price))
      setServiceDraft({ name: '', description: '', duration_min: 30, price: 0 })
      setNotice('Novo serviço adicionado.')
    }
    setBusyId('')
  }

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !settings) return
    setSavingSettings(true)
    setNotice('')
    const { error } = await supabase.from('shop_settings').update({
      open_time: settings.open_time,
      close_time: settings.close_time,
      closed_days: settings.closed_days,
      whatsapp: settings.whatsapp,
      address: settings.address,
    }).eq('id', 1)
    setSavingSettings(false)
    setNotice(error ? 'Não foi possível salvar as informações.' : 'Informações da barbearia atualizadas.')
  }

  const logout = async () => {
    if (!await onLogout()) setNotice('Não foi possível encerrar a sessão. Tente novamente.')
  }

  if (accessLoading) return <div className="screen-loader"><LoaderCircle className="spin" size={22} /> Carregando seu painel</div>
  if (!authorized) return (
    <main className="admin-shell">
      <div className="admin-topbar"><button className="back-link" onClick={() => void onBack()}><ArrowLeft size={16} /> Voltar ao site</button><a className="brand" href="#"><span className="brand-mark"><Scissors size={18} /></span><span className="brand-name">NATÃ GARCIA<span>BARBEARIA</span></span></a><span className="admin-top-label">PAINEL DO PROPRIETÁRIO</span></div>
      <section className="access-denied"><span className="login-icon"><LockKeyhole size={19} /></span><p className="eyebrow"><span className="eyebrow-dot" /> Acesso do proprietário</p><h1>Esta conta não tem acesso ao painel.</h1><p>Entre com a conta do proprietário cadastrada para a Barbearia do Natã Garcia.</p>{notice && <p className="form-error" role="alert">{notice}</p>}<button className="button button-dark" onClick={async () => { if (await onLogout()) onBack(); else setNotice('Não foi possível encerrar a sessão. Tente novamente.') }}>Sair e voltar ao site <ArrowLeft size={16} /></button></section>
    </main>
  )

  const filtered = appointments.filter((appointment) => appointment.appointment_date === selectedDate && (showCancelled || appointment.status !== 'cancelled'))

  return (
    <main className="admin-shell dashboard-shell">
      <header className="dashboard-header">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); onBack() }}><span className="brand-mark"><Scissors size={18} /></span><span className="brand-name">NATÃ GARCIA<span>BARBEARIA</span></span></a>
        <div className="dashboard-actions"><span className="owner-greeting"><span className="online-dot" /> Painel do proprietário</span><button className="dashboard-site-link" onClick={onBack}>Ver site <ArrowUpRight size={14} /></button><button className="icon-button" aria-label="Sair" onClick={() => void logout()}><LogOut size={17} /></button></div>
      </header>
      <div className="dashboard-body">
        <div className="dashboard-title-row"><div><p className="eyebrow"><span className="eyebrow-dot" /> Visão geral</p><h1>Bom dia, <em>Natã.</em></h1><p className="dashboard-date">{formatDate(localDate(), { weekday: 'long', day: 'numeric', month: 'long' })} · Atlântica, Rio das Ostras</p></div><button className="button button-dark" onClick={() => { setTab('agenda'); setSelectedDate(localDate()) }}><Plus size={16} /> Ver agenda de hoje</button></div>
        <div className="stats-grid">
          <article className="stat-card"><span>NA AGENDA DE HOJE</span><strong>{todayAppointments.length.toString().padStart(2, '0')}</strong><small><CalendarDays size={14} /> horários marcados</small></article>
          <article className="stat-card"><span>PRECISAM DE ATENÇÃO</span><strong>{pendingCount.toString().padStart(2, '0')}</strong><small><Clock3 size={14} /> aguardando confirmação</small></article>
          <article className="stat-card stat-card-accent"><span>FECHADO HOJE</span><strong>{money(revenue)}</strong><small><CheckCircle2 size={14} /> serviços concluídos</small></article>
        </div>
        <nav className="dashboard-tabs" aria-label="Seções do painel">
          <button className={tab === 'agenda' ? 'active' : ''} onClick={() => setTab('agenda')}><CalendarDays size={16} /> Agenda</button>
          <button className={tab === 'services' ? 'active' : ''} onClick={() => setTab('services')}><Scissors size={16} /> Serviços</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><ChevronDown size={16} /> Informações</button>
        </nav>
        {notice && <p className="dashboard-notice" role="status">{notice}<button aria-label="Fechar aviso" onClick={() => setNotice('')}><X size={14} /></button></p>}
        {tab === 'agenda' && (
          <section className="dashboard-content">
            <div className="agenda-toolbar"><div><h2>Agenda</h2><p>Seus atendimentos, sem susto e sem papel.</p></div><label className="date-picker"><CalendarDays size={16} /><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label></div>
            <label className="show-cancelled"><input type="checkbox" checked={showCancelled} onChange={event => setShowCancelled(event.target.checked)} /> Mostrar agendamentos cancelados</label>
            {filtered.length ? <div className="appointment-list">{filtered.map((appointment) => (
              <article className="appointment-row" key={appointment.id}>
                <div className="appointment-time">{formatTime(appointment.start_time)}<span>{appointment.services?.name ?? 'Serviço'}</span></div>
                <div className="appointment-client"><strong>{appointment.customer_name}</strong><a href={`https://wa.me/${appointment.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><Phone size={13} /> {appointment.customer_phone}</a></div>
                <div className="appointment-meta"><span>{appointment.barbers?.name ?? 'Natã'}</span><strong>{money(appointment.services?.price ?? 0)}</strong></div>
                <span className={`status-pill status-${appointment.status}`}>{statusLabels[appointment.status]}</span>
                <label className="status-control"><span className="sr-only">Status de {appointment.customer_name}</span><select aria-label={`Status do horário de ${appointment.customer_name}`} disabled={busyId === appointment.id} value={appointment.status} onChange={(event) => void updateStatus(appointment.id, event.target.value as Appointment['status'])}><option value="pending">Aguardando</option><option value="confirmed">Confirmado</option><option value="completed">Concluído</option><option value="cancelled">Cancelar</option></select></label>
                <button className="delete-appointment" disabled={busyId === appointment.id} onClick={() => void deleteAppointment(appointment)} aria-label={`Excluir agendamento de ${appointment.customer_name}`}><Trash2 size={15} /> Excluir</button>
              </article>
            ))}</div> : <div className="empty-agenda"><CalendarDays size={24} /><strong>Nenhum horário por aqui.</strong><span>Essa data está livre. Um bom momento pra respirar.</span></div>}
          </section>
        )}
        {tab === 'services' && (
          <section className="dashboard-content">
            <div className="agenda-toolbar"><div><h2>Serviços da casa</h2><p>Edite valores, duração e disponibilidade.</p></div></div>
            <div className="manage-services">{services.map((service) => <ServiceEditor key={service.id} service={service} busy={busyId === service.id} onSave={updateService} />)}</div>
            <form className="new-service-form" onSubmit={createService}>
              <div className="new-service-heading"><Plus size={18} /><span><strong>Um serviço novo?</strong><small>Adicione ao menu da barbearia.</small></span></div>
              <div className="new-service-fields"><label>Nome<input required value={serviceDraft.name} onChange={(event) => setServiceDraft({ ...serviceDraft, name: event.target.value })} placeholder="Ex.: Acabamento" /></label><label>Descrição<input value={serviceDraft.description} onChange={(event) => setServiceDraft({ ...serviceDraft, description: event.target.value })} placeholder="Uma breve descrição" /></label><label>Duração (min)<input required type="number" min="15" step="15" value={serviceDraft.duration_min} onChange={(event) => setServiceDraft({ ...serviceDraft, duration_min: Number(event.target.value) })} /></label><label>Valor (R$)<input required type="number" min="0" step="1" value={serviceDraft.price} onChange={(event) => setServiceDraft({ ...serviceDraft, price: Number(event.target.value) })} /></label><button className="button button-dark" disabled={busyId === 'new'} type="submit">{busyId === 'new' ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />} Adicionar serviço</button></div>
            </form>
          </section>
        )}
        {tab === 'settings' && settings && (
          <section className="dashboard-content">
            <div className="agenda-toolbar"><div><h2>Informações da barbearia</h2><p>Atualize o que seus clientes veem no site.</p></div></div>
            <form className="settings-form" onSubmit={saveSettings}>
              <div className="settings-hours"><label>Abre às<input type="time" required value={settings.open_time} onChange={(event) => setSettings({ ...settings, open_time: event.target.value })} /></label><label>Fecha às<input type="time" required value={settings.close_time} onChange={(event) => setSettings({ ...settings, close_time: event.target.value })} /></label></div>
              <fieldset className="closed-days"><legend>Dia(s) de folga</legend><div>{weekDays.map((day, index) => <label key={day}><input type="checkbox" checked={settings.closed_days.includes(index)} onChange={(event) => setSettings({ ...settings, closed_days: event.target.checked ? [...settings.closed_days, index].sort() : settings.closed_days.filter((item) => item !== index) })} /><span>{day}</span></label>)}</div></fieldset>
              <label className="settings-wide">WhatsApp de contato<input type="tel" value={settings.whatsapp} onChange={(event) => setSettings({ ...settings, whatsapp: event.target.value })} placeholder="(22) 99999-9999" /></label>
              <label className="settings-wide">Endereço para o mapa<input value={settings.address} onChange={(event) => setSettings({ ...settings, address: event.target.value })} placeholder="Rua, bairro, Rio das Ostras - RJ" /></label>
              <button className="button button-dark settings-save" disabled={savingSettings} type="submit">{savingSettings ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />} Salvar informações</button>
            </form>
          </section>
        )}
        <footer className="dashboard-footer"><span>BARBEARIA DO NATÃ GARCIA · ATLÂNTICA</span><span>Feito com cuidado, como tudo por aqui.</span></footer>
      </div>
    </main>
  )
}

function ServiceEditor({ service, busy, onSave }: { service: ShopService; busy: boolean; onSave: (service: ShopService) => void }) {
  const [draft, setDraft] = useState(service)
  const changed = draft.name !== service.name || draft.description !== service.description || draft.duration_min !== service.duration_min || draft.price !== service.price || draft.active !== service.active
  return (
    <article className={`service-editor ${draft.active ? '' : 'is-inactive'}`}>
      <label>Nome<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Descrição<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <label>Duração<input type="number" min="15" step="15" value={draft.duration_min} onChange={(event) => setDraft({ ...draft, duration_min: Number(event.target.value) })} /></label>
      <label>Valor (R$)<input type="number" min="0" step="1" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} /></label>
      <label className="active-toggle"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /><span>{draft.active ? 'No menu' : 'Pausado'}</span></label>
      <button className="button button-quiet save-service" disabled={!changed || busy || !draft.name.trim()} onClick={() => onSave(draft)}>{busy ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />} Salvar</button>
    </article>
  )
}

export default App
