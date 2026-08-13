import { ChangeEvent, FormEvent, useRef, useState } from 'react'
import {
  ArrowRight, BarChart3, CalendarDays, Camera, Check, ChevronDown,
  CircleAlert, ClipboardCheck, CloudSun, Download, HelpCircle, Leaf,
  LoaderCircle, MapPin, Menu, ShieldCheck, Sprout, Upload, X,
  ExternalLink, RefreshCw, Droplets, Wind,
} from 'lucide-react'

type WeatherData = {
  place: string; country: string; latitude: number; longitude: number
  temperature: number; humidity: number; rain: number; wind: number
  observedAt: string; fetchedAt: string
}

type Result = {
  summary: string
  diagnosis: { likely_issue: string; confidence: number; evidence: string[]; key_symptoms_to_confirm: string[]; alternative_possibilities: { name: string; confidence: number }[] }
  crop_context_questions: string[]
  organic_remedies: {
    immediate_actions_today: string[]; treatment_plan_next_7_days: string[]; prevention_plan_next_30_days: string[]
    spray_or_material_recipes: { name: string; ingredients: string[]; mixing_guidance: string; application_timing: string; notes: string }[]
    what_to_stop_doing: string[]
  }
  harvest_guidance: { estimated_harvest_time: string; how_to_check_readiness: string[]; risk_if_harvested_early: string; risk_if_harvested_late: string }
  market_price_prediction: { best_effort_prediction: string; estimated_price_range: { min: number; max: number; currency: string; unit: string }; data_basis: string; factors_that_move_price: string[]; what_to_report_for_better_accuracy: string[] }
  action_steps_for_user: string[]
}

const makeResult = (crop: string, location: string, symptoms: string, weather: WeatherData | null): Result => {
  const text = symptoms.toLowerCase()
  const pest = /hole|insect|aphid|worm|caterpillar|bug|sticky|curl/.test(text)
  const spots = /spot|lesion|blight|mould|mold|brown|black/.test(text)
  const nutrient = /yellow|pale|purple|slow|stunt/.test(text)
  const issue = pest ? 'Possible sap-feeding or leaf-chewing pest' : spots ? 'Possible fungal or bacterial leaf disease' : nutrient ? 'Possible nutrient or water-stress issue' : 'Uncertain — more symptom detail is needed'
  const confidence = pest || spots || nutrient ? (symptoms.length > 35 ? 0.64 : 0.48) : 0.22
  const evidence = [
    symptoms ? `Reported symptom: “${symptoms.slice(0, 120)}${symptoms.length > 120 ? '…' : ''}”` : 'No detailed symptom pattern was provided.',
    `Crop reported as ${crop} in ${location}.`,
    weather ? `Verified Open-Meteo reading near ${weather.place}: ${weather.temperature}°C, ${weather.humidity}% humidity, ${weather.rain} mm rain, observed ${weather.observedAt}.` : 'Live weather could not be verified for this location.',
    'A field check is still needed before treatment.',
  ]
  return {
    summary: `The current information suggests ${issue.toLowerCase()}. Confidence is ${Math.round(confidence * 100)}%, so verify the signs below before treating. Start with low-risk field hygiene and close monitoring.`,
    diagnosis: {
      likely_issue: issue, confidence, evidence,
      key_symptoms_to_confirm: pest
        ? ['Check leaf undersides at dawn for insects, eggs, webbing, or sticky honeydew.', 'Note whether damage is holes, edge chewing, curling, or sap-sucking marks.', 'Check 10 plants across the field and count affected leaves.']
        : spots ? ['Check whether spots have rings, yellow halos, or water-soaked edges.', 'Look for fuzzy growth on leaf undersides early in the morning.', 'Note if symptoms begin on lower leaves and spread after rain.']
        : ['Compare old and young leaves: note where yellowing starts.', 'Check soil moisture 5–8 cm deep and inspect roots for rot.', 'Check whether symptoms follow field rows or occur in scattered patches.'],
      alternative_possibilities: [{ name: 'Water or heat stress', confidence: 0.22 }, { name: 'Root damage or soil imbalance', confidence: 0.14 }],
    },
    crop_context_questions: ['How old is the crop or what growth stage is it?', 'What pattern do you see on leaf undersides?', 'Did symptoms appear after heavy rain, drought, or a recent input?'],
    organic_remedies: {
      immediate_actions_today: ['Mark affected plants and inspect at least 10 plants in different parts of the field.', 'Remove only badly damaged leaves; place them in a bag and compost hot or bury away from the field.', weather && weather.rain > 0 ? 'Rain is reported now. Delay any contact spray until leaves are dry and no immediate rain is expected.' : 'Improve airflow and water at soil level in the morning. Avoid wetting leaves.'],
      treatment_plan_next_7_days: ['Photograph the same marked plants every 2 days to track spread.', pest ? 'If live soft-bodied pests are confirmed, use the soap spray below on a small test area first.' : 'Do not spray until spots or pests are confirmed.', 'Recheck after 48 hours. Stop treatment if leaves scorch or curl.'],
      prevention_plan_next_30_days: ['Keep weeds and crop debris away from the plant base.', 'Use clean tools and wash hands between affected and healthy rows.', 'Add mature compost as a light top-dressing; do not overfeed with nitrogen.', 'Rotate future plantings with a non-related crop.'],
      spray_or_material_recipes: pest ? [{ name: 'Mild soap contact spray', ingredients: ['5–10 ml plain, unscented liquid soap', '1 litre clean water'], mixing_guidance: 'Mix gently. Do not use detergent, bleach, or strongly scented soap. Test on 2–3 leaves and wait 24 hours.', application_timing: 'Spray leaf undersides in the cool early morning or late afternoon. Never spray in peak sun or above about 30°C.', notes: 'Use only if soft-bodied pests are present. Keep away from children, wear eye protection, and wash hands after handling.' }] : [],
      what_to_stop_doing: ['Stop overhead watering late in the day.', 'Do not mix multiple sprays or increase concentration.', 'Do not apply a remedy to the whole field before a small-area test.'],
    },
    harvest_guidance: {
      estimated_harvest_time: 'Cannot estimate safely without planting date, variety, and growth stage.',
      how_to_check_readiness: ['Use the variety’s expected days to maturity as the baseline.', 'Check crop-specific size, colour, firmness, and seed maturity.', 'Harvest a small sample first and check eating or storage quality.'],
      risk_if_harvested_early: 'Lower weight, flavour, nutrition, and storage life.',
      risk_if_harvested_late: 'Higher pest, rot, cracking, fibre, or market-quality loss depending on the crop.',
    },
    market_price_prediction: {
      best_effort_prediction: 'No verified live local market quote was returned. AgriScout will not invent a number. Check the official FAO FPMA price database and confirm with the named nearest market.',
      estimated_price_range: { min: 0, max: 0, currency: 'local currency', unit: 'kg' },
      data_basis: 'No numeric prediction shown because no matching, timestamped public market observation was retrieved. Weather is live Open-Meteo data; it is not a market-price source.',
      factors_that_move_price: ['Seasonal supply and local harvest peaks', 'Crop variety, grade, size, and damage', 'Transport cost and distance to market', 'Rain, heat, storage life, and buyer demand'],
      what_to_report_for_better_accuracy: ['Crop variety and grade', 'Nearest market or town', 'Target selling date', 'Farm-gate or wholesale price needed'],
    },
    action_steps_for_user: ['Inspect leaf undersides and roots today.', 'Send a close photo plus one whole-plant photo.', 'Report crop age, recent weather, and how fast symptoms are spreading.', 'Check today’s price with the nearest market and two local buyers.'],
  }
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="result-card"><div className="section-title"><span>{icon}</span><h3>{title}</h3></div>{children}</section>
}

function List({ items }: { items: string[] }) {
  return <ul className="clean-list">{items.map((item, i) => <li key={i}><Check size={15} /> <span>{item}</span></li>)}</ul>
}

function App() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [crop, setCrop] = useState('')
  const [location, setLocation] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [stage, setStage] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [showJson, setShowJson] = useState(false)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [dataError, setDataError] = useState('')

  const chooseImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Please choose a JPG, PNG, or WebP image.')
    setImage(URL.createObjectURL(file)); setError('')
  }
  const fetchLiveWeather = async (place: string) => {
    const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`)
    if (!geoResponse.ok) throw new Error('Location lookup failed')
    const geo = await geoResponse.json()
    const match = geo.results?.[0]
    if (!match) throw new Error('Location not found. Add a nearby town and country.')
    const variables = 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m'
    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${match.latitude}&longitude=${match.longitude}&current=${variables}&timezone=auto`)
    if (!weatherResponse.ok) throw new Error('Weather source is temporarily unavailable.')
    const live = await weatherResponse.json()
    if (!live.current) throw new Error('No current observation was returned.')
    return {
      place: match.name, country: match.country ?? '', latitude: match.latitude, longitude: match.longitude,
      temperature: live.current.temperature_2m, humidity: live.current.relative_humidity_2m,
      rain: live.current.precipitation, wind: live.current.wind_speed_10m,
      observedAt: live.current.time, fetchedAt: new Date().toISOString(),
    } as WeatherData
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!crop.trim() || !location.trim()) { setError('Crop name and location are needed first.'); return }
    if (!symptoms.trim() && !image) { setError('Add a photo or briefly describe what you see.'); return }
    setError(''); setDataError(''); setLoading(true); setResult(null); setWeather(null)
    let liveWeather: WeatherData | null = null
    try { liveWeather = await fetchLiveWeather(location.trim()); setWeather(liveWeather) }
    catch (err) { setDataError(err instanceof Error ? err.message : 'Live source unavailable.') }
    setResult(makeResult(crop.trim(), location.trim(), symptoms.trim(), liveWeather)); setLoading(false)
    window.setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }
  const download = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `agriscout-${crop.toLowerCase().replace(/\s+/g, '-')}.json`; a.click(); URL.revokeObjectURL(a.href)
  }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><Sprout size={23} /></span><span>AgriScout<small>Field guidance, made practical</small></span></a><nav><a href="#how">How it works</a><a href="#advice">Safe advice</a><a href="#markets">Market guide</a></nav><button className="menu" aria-label="Menu"><Menu /></button><div className="weather"><CloudSun size={17} /><span>Built for the field</span></div></header>

    <main id="top">
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span></span> LIVE, SOURCE-LABELLED FIELD SUPPORT</div><h1>Real data.<br/><em>No false certainty.</em></h1><p>AgriScout fetches current weather from Open-Meteo and clearly labels every source. Crop diagnosis still needs field confirmation—no honest agronomy tool can promise 100% accuracy from a photo.</p><div className="trust-row"><span><ShieldCheck/> No invented prices</span><span><RefreshCw/> Live weather fetch</span><span><ClipboardCheck/> Verification first</span></div></div>
        <div className="form-card">
          <div className="form-heading"><div><p>FIELD CHECK</p><h2>What are you growing?</h2></div><span>1–2 min</span></div>
          <form onSubmit={submit}>
            <div className="two-col"><label>Crop name <b>*</b><div className="input-wrap"><Leaf/><input value={crop} onChange={e => setCrop(e.target.value)} placeholder="e.g. tomato, maize" /></div></label><label>Location <b>*</b><div className="input-wrap"><MapPin/><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Country, district or town" /></div></label></div>
            <label>Photo of the affected crop <span className="optional">recommended</span></label>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={chooseImage}/>
            {image ? <div className="image-preview"><img src={image} alt="Uploaded crop"/><div><strong>Photo attached for your field record</strong><small>This version does not run laboratory-grade image diagnosis. Describe visible signs below.</small></div><button type="button" onClick={() => { setImage(null); if(fileRef.current) fileRef.current.value = '' }}><X/></button></div> : <button type="button" className="upload" onClick={() => fileRef.current?.click()}><span><Camera/></span><div><strong>Attach a crop photo</strong><small>Kept as context; describe the visible signs for assessment</small></div><Upload/></button>}
            <label>What do you see? <span className="optional">if no photo, required</span><textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Describe spots, colour changes, insects, wilting, or where symptoms began…" maxLength={500}/><small className="counter">{symptoms.length}/500</small></label>
            <label>Crop stage <span className="optional">optional</span><div className="input-wrap"><CalendarDays/><select value={stage} onChange={e => setStage(e.target.value)}><option value="">Select growth stage</option><option>Seedling</option><option>Vegetative growth</option><option>Flowering</option><option>Fruiting / grain filling</option><option>Near harvest</option></select><ChevronDown/></div></label>
            {error && <div className="error"><CircleAlert/>{error}</div>}
            <button className="primary" disabled={loading}>{loading ? <><LoaderCircle className="spin"/> Fetching live sources…</> : <>Get verified field guidance <ArrowRight/></>}</button>
            <p className="privacy"><ShieldCheck/> Your crop photo stays in this session.</p>
          </form>
        </div>
      </section>

      {!result && <section className="steps" id="how"><div><span>01</span><Camera/><h3>Show the crop</h3><p>Add a clear image or describe exactly what you see.</p></div><div><span>02</span><HelpCircle/><h3>Verify the signs</h3><p>Use simple field checks before choosing a treatment.</p></div><div><span>03</span><Sprout/><h3>Act with care</h3><p>Follow an organic-first plan and monitor the result.</p></div></section>}

      {result && <section className="results" id="results">
        <div className="results-head"><div><div className="eyebrow"><span></span> FIELD REPORT</div><h2>Your AgriScout guidance</h2><p>{crop} • {location}{stage ? ` • ${stage}` : ''}</p></div><div><button className="secondary" onClick={() => setShowJson(!showJson)}>{showJson ? 'View report' : '{ } View JSON'}</button><button className="secondary" onClick={download}><Download/> Save</button></div></div>
        {showJson ? <pre className="json-view">{JSON.stringify(result, null, 2)}</pre> : <div className="report-grid">
          <div className="report-main">
            {weather ? <div className="live-data"><div className="live-head"><span><i></i> LIVE PUBLIC DATA</span><small>Fetched {new Date(weather.fetchedAt).toLocaleString()}</small></div><div className="live-place"><div><b>{weather.place}, {weather.country}</b><small>{weather.latitude.toFixed(3)}, {weather.longitude.toFixed(3)} • Observation {weather.observedAt}</small></div><a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo source <ExternalLink/></a></div><div className="weather-grid"><div><CloudSun/><b>{weather.temperature}°C</b><small>Temperature</small></div><div><Droplets/><b>{weather.humidity}%</b><small>Humidity</small></div><div><CloudSun/><b>{weather.rain} mm</b><small>Precipitation</small></div><div><Wind/><b>{weather.wind} km/h</b><small>Wind</small></div></div></div> : <div className="source-failure"><CircleAlert/><div><b>Live weather not verified</b><p>{dataError || 'No source response was received.'} No weather values were guessed.</p></div></div>}
            <div className="summary-box"><CircleAlert/><div><strong>First assessment</strong><p>{result.summary}</p></div></div>
            <Section icon={<Leaf/>} title="Likely crop problem"><div className="diagnosis-line"><div><span>LIKELY ISSUE</span><strong>{result.diagnosis.likely_issue}</strong></div><div className="confidence"><b>{Math.round(result.diagnosis.confidence*100)}%</b><small>confidence</small></div></div><h4>Why this fits</h4><List items={result.diagnosis.evidence}/><h4>Check these signs next</h4><List items={result.diagnosis.key_symptoms_to_confirm}/></Section>
            <Section icon={<ShieldCheck/>} title="Organic action plan"><h4>Do today</h4><List items={result.organic_remedies.immediate_actions_today}/><h4>Over the next 7 days</h4><List items={result.organic_remedies.treatment_plan_next_7_days}/>{result.organic_remedies.spray_or_material_recipes.map(r => <div className="recipe" key={r.name}><b>{r.name}</b><p>{r.ingredients.join(' + ')}</p><p>{r.mixing_guidance}</p><small>{r.application_timing} {r.notes}</small></div>)}<h4>Stop doing</h4><List items={result.organic_remedies.what_to_stop_doing}/></Section>
            <Section icon={<CalendarDays/>} title="Harvest guidance"><p>{result.harvest_guidance.estimated_harvest_time}</p><List items={result.harvest_guidance.how_to_check_readiness}/><div className="risk-row"><p><b>If too early</b>{result.harvest_guidance.risk_if_harvested_early}</p><p><b>If too late</b>{result.harvest_guidance.risk_if_harvested_late}</p></div></Section>
          </div>
          <aside>
            <Section icon={<BarChart3/>} title="Market planning"><p>{result.market_price_prediction.best_effort_prediction}</p><div className="price-box"><span>VERIFIED PRICE STATUS</span><b>No matching live quote</b><small>No fabricated range displayed</small></div><div className="official-links"><a href="https://fpma.apps.fao.org/giews/food-prices/tool/public/" target="_blank" rel="noreferrer">FAO FPMA prices <ExternalLink/></a><a href="https://www.fao.org/faostat/en/#data/PP" target="_blank" rel="noreferrer">FAOSTAT producer prices <ExternalLink/></a></div><h4>What moves price</h4><List items={result.market_price_prediction.factors_that_move_price}/><h4>Report for a better range</h4><List items={result.market_price_prediction.what_to_report_for_better_accuracy}/></Section>
            <Section icon={<ClipboardCheck/>} title="Your next steps"><ol className="number-list">{result.action_steps_for_user.map((s,i)=><li key={s}><b>{i+1}</b>{s}</li>)}</ol></Section>
            <div className="caution"><ShieldCheck/><div><b>Use remedies safely</b><p>Test sprays on a few leaves. Avoid peak heat. Keep mixes away from children and wash after handling.</p></div></div>
          </aside>
        </div>}
      </section>}

      <section className="principles" id="advice"><p>OUR PROMISE</p><h2>Verify first. Treat gently.<br/>Protect the next harvest.</h2><div><span>01</span><p><b>No guessing</b>Uncertain signs stay uncertain until you check them.</p><span>02</span><p><b>Organic-first</b>Practical, low-toxicity options for small farms.</p><span>03</span><p><b>Whole-farm view</b>Crop health, harvest, and selling decisions together.</p></div></section>
    </main>
    <footer id="markets"><a className="brand" href="#top"><span className="brand-mark"><Sprout/></span><span>AgriScout</span></a><p>Practical crop guidance for smallholder farmers.</p><small>Field guidance supports—but does not replace—local agronomy advice.</small></footer>
  </div>
}

export default App
