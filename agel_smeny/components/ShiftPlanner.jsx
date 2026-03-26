'use client'
import { useState } from 'react'

const AGEL = {
  navy:"#003366", navyMid:"#00499A", navyLight:"#E8EEF6",
  red:"#E30613", redLight:"#FDECEA",
  white:"#FFFFFF", gray50:"#F7F8FA", gray100:"#EEF0F4",
  gray200:"#D6DAE3", gray400:"#9199AA", gray700:"#3D4557", text:"#1A2236",
}

const STAFF = [
  { id:1,  name:"Dis. Zemanová Adriana",  email:"" },
  { id:2,  name:"Friedmannová Tereza",    email:"terkafriedmannova39@gmail.com" },
  { id:3,  name:"Zvolenská Lucie",        email:"" },
  { id:4,  name:"Křevká Irena",           email:"" },
  { id:5,  name:"Hudzieczková Sylvie",    email:"" },
  { id:6,  name:"Bc. Rišicová Eva",       email:"" },
  { id:7,  name:"Bc. Worková Petra",      email:"" },
  { id:8,  name:"Ražimová Radka",         email:"" },
  { id:9,  name:"Berdychová Michaela",    email:"" },
  { id:10, name:"Bc. Jochymková Marie",   email:"" },
]

const SHIFTS = [
  { code:"D",  label:"Denní",     hours:"07:00–19:00", bg:"#E8EEF6", border:"#00499A", text:"#003366" },
  { code:"N",  label:"Noční",     hours:"19:00–07:00", bg:"#F0EEF9", border:"#5B4DB3", text:"#3A2E8C" },
  { code:"R",  label:"Odpočinek", hours:null,           bg:"#F7F8FA", border:"#9199AA", text:"#5A6170" },
  { code:"X",  label:"Absence",   hours:null,           bg:"#FDECEA", border:"#E30613", text:"#A00010" },
  { code:"Do", label:"Dovolená",  hours:null,           bg:"#E6F7F0", border:"#0A7A50", text:"#065C3A" },
  { code:"",   label:"Vymazat",   hours:null,           bg:"transparent", border:"#D6DAE3", text:"#9199AA" },
]
const sMap = Object.fromEntries(SHIFTS.map(s=>[s.code,s]))

const DAYS = Array.from({length:30},(_,i)=>i+1)
const CS_DAYS = ["Po","Út","St","Čt","Pá","So","Ne"]
const dow = d => new Date(2026,3,d).getDay()
const isWE = d => { const w=dow(d); return w===0||w===6 }

const blank = {}
STAFF.forEach(s=>{ blank[s.id]={}; DAYS.forEach(d=>{ blank[s.id][d]="" }) })

function Cell({val, onClick, synced}) {
  const s = sMap[val]??sMap[""]
  return (
    <td onClick={onClick} style={{cursor:"pointer",textAlign:"center",padding:"1px",position:"relative"}}>
      <div style={{
        background:s.bg, color:s.text, borderRadius:3,
        fontSize:9, fontWeight:700, padding:"3px 1px",
        border:`1px solid ${val?s.border:"#E0E3EA"}`,
        userSelect:"none", minWidth:22, position:"relative"
      }}>
        {val||<span style={{opacity:0.2}}>·</span>}
        {synced&&val&&<span style={{position:"absolute",top:-3,right:-2,width:5,height:5,borderRadius:"50%",background:"#1D9E75",border:"1.5px solid white"}}/>}
      </div>
    </td>
  )
}

export default function ShiftPlanner() {
  const [shifts,setShifts]=useState(blank)
  const [picker,setPicker]=useState(null)
  const [search,setSearch]=useState("")
  const [synced,setSynced]=useState({})
  const [log,setLog]=useState([])
  const [loading,setLoading]=useState(false)
  const [tab,setTab]=useState("planner")

  const addLog=(msg,type="info")=>setLog(p=>[{msg,type,t:new Date().toLocaleTimeString("cs-CZ")},...p].slice(0,40))

  async function syncShift(sid,day) {
    const st=STAFF.find(s=>s.id===sid)
    const code=shifts[sid][day]
    if(!code||["R","X","Do"].includes(code)){addLog(`Přeskočeno — ${st.name} ${day}.4.`,"warn");return}
    const si=sMap[code]
    const isNight=code==="N"
    const pad=n=>String(n).padStart(2,"0")
    const startDate=`2026-04-${pad(day)}`
    const endDate=isNight?`2026-04-${pad(Math.min(day+1,30))}`:startDate
    const prompt=`Use Google Calendar MCP to create:
Title: "🏥 ${st.name} — ${si.label} směna"
Start: ${startDate} at ${isNight?"19:00":"07:00"} Europe/Prague
End: ${endDate} at ${isNight?"07:00":"19:00"} Europe/Prague
Description: "AGEL Nemocnice Třinec-Podlesí\nKardiochirurgie JIP\n${st.name}\n${si.label} (${si.hours||"—"})"
Color: ${code==="D"?"blue":"grape"}${st.email?`\nInvite: ${st.email}`:""}
Respond ONLY with JSON: {"success":true} or {"success":false,"error":"..."}`
    setLoading(true)
    addLog(`Sync: ${st.name} · ${day}.4. (${si.label})…`)
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY||""},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:300,
          messages:[{role:"user",content:prompt}],
          mcp_servers:[{type:"url",url:"https://gcal.mcp.claude.com/mcp",name:"gcal"}]
        })
      })
      const data=await res.json()
      const txt=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||""
      let parsed;try{parsed=JSON.parse(txt.replace(/```json|```/g,"").trim())}catch{parsed=null}
      if(parsed?.success){setSynced(p=>({...p,[`${sid}_${day}`]:true}));addLog(`✓ ${st.name} ${day}.4.`,"success")}
      else addLog(`✗ ${parsed?.error||"Chyba"}`,"error")
    } catch(e){addLog(`✗ ${e.message}`,"error")}
    setLoading(false)
  }

  async function syncAll() {
    for(const s of STAFF)
      for(const d of DAYS)
        if(shifts[s.id][d]&&!["R","X","Do",""].includes(shifts[s.id][d]))
          await syncShift(s.id,d)
  }

  function assignShift(code) {
    if(!picker)return
    setShifts(p=>({...p,[picker.sid]:{...p[picker.sid],[picker.day]:code}}))
    setSynced(p=>{const n={...p};delete n[`${picker.sid}_${picker.day}`];return n})
    setPicker(null)
  }

  const filtered=STAFF.filter(s=>!search||s.name.toLowerCase().includes(search.toLowerCase()))
  const cntD=sid=>DAYS.filter(d=>shifts[sid][d]==="D").length
  const cntN=sid=>DAYS.filter(d=>shifts[sid][d]==="N").length
  const cntA=sid=>DAYS.filter(d=>shifts[sid][d]&&!["R","X","Do"].includes(shifts[sid][d])).length
  const totalA=STAFF.reduce((a,s)=>a+cntA(s.id),0)
  const syncedT=Object.values(synced).filter(Boolean).length

  return (
    <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",fontSize:13,background:AGEL.gray50,minHeight:"100vh"}}>
      <div style={{background:AGEL.navy,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{background:AGEL.red,borderRadius:3,padding:"4px 12px",color:AGEL.white,fontWeight:900,fontSize:14,letterSpacing:"2px"}}>AGEL</div>
          <div>
            <div style={{color:AGEL.white,fontWeight:700,fontSize:14}}>Nemocnice Třinec-Podlesí</div>
            <div style={{color:"rgba(255,255,255,0.55)",fontSize:11}}>Kardiochirurgie · JIP · Duben 2026</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.6)",padding:"4px 10px",background:"rgba(255,255,255,0.08)",borderRadius:3}}>{syncedT}/{totalA} sync</span>
          <button onClick={syncAll} disabled={loading||totalA===0} style={{padding:"5px 14px",fontSize:11,borderRadius:3,cursor:"pointer",background:AGEL.red,color:AGEL.white,border:"none",fontWeight:700}}>
            {loading?"SYNCHRONIZACE…":"↑ PUSH DO GOOGLE CALENDAR"}
          </button>
        </div>
      </div>
      <div style={{background:AGEL.navyLight,borderBottom:`2px solid ${AGEL.navy}`,padding:"0 16px",display:"flex",gap:2,alignItems:"flex-end"}}>
        {[["planner","Plánování"],["log",`Protokol${log.length?` (${log.length})`:""}`]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"5px 14px",fontSize:11,cursor:"pointer",fontWeight:700,letterSpacing:"0.5px",
            background:tab===t?AGEL.white:"transparent",color:tab===t?AGEL.navy:AGEL.gray400,
            border:tab===t?`1px solid ${AGEL.gray200}`:"1px solid transparent",
            borderBottom:tab===t:`1px solid ${AGEL.white}`:"none",borderRadius:"3px 3px 0 0",textTransform:"uppercase"
          }}>{l}</button>
        ))}
        <div style={{marginLeft:"auto",paddingBottom:4}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Hledat…"
            style={{padding:"3px 8px",fontSize:11,borderRadius:3,border:`1px solid ${AGEL.gray200}`,background:AGEL.white,width:140}}/>
        </div>
      </div>
      <div style={{padding:"12px 16px"}}>
        <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
          {SHIFTS.filter(s=>s.code).map(s=>(
            <div key={s.code} style={{display:"flex",alignItems:"center",gap:3,fontSize:11}}>
              <div style={{padding:"1px 7px",background:s.bg,border:`1px solid ${s.border}`,borderRadius:3,color:s.text,fontWeight:700,fontSize:10}}>{s.code}</div>
              <span style={{color:AGEL.gray700}}>{s.label}</span>
              {s.hours&&<span style={{color:AGEL.gray400,fontSize:10}}>{s.hours}</span>}
            </div>
          ))}
        </div>
        {picker&&(
          <div style={{marginBottom:10,padding:"8px 12px",background:AGEL.white,borderRadius:4,border:`2px solid ${AGEL.navy}`,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:AGEL.navy,fontWeight:700}}>{STAFF.find(s=>s.id===picker.sid)?.name} · {picker.day}. dubna:</span>
            {SHIFTS.map(s=>(
              <button key={s.code} onClick={()=>assignShift(s.code)} style={{padding:"4px 12px",fontSize:11,borderRadius:3,cursor:"pointer",fontWeight:700,background:s.bg||AGEL.white,color:s.text,border:`1px solid ${s.border}`}}>{s.code||"—"}</button>
            ))}
            <button onClick={()=>setPicker(null)} style={{marginLeft:"auto",fontSize:13,color:AGEL.gray400,background:"none",border:"none",cursor:"pointer"}}>✕</button>
          </div>
        )}
        {tab==="planner"&&(
          <div style={{overflowX:"auto",borderRadius:4,border:`1px solid ${AGEL.gray200}`,background:AGEL.white}}>
            <table style={{borderCollapse:"collapse",tableLayout:"fixed",minWidth:900}}>
              <colgroup><col style={{width:170}}/>{DAYS.map(d=><col key={d} style={{width:27}}/>)}<col style={{width:28}}/><col style={{width:28}}/></colgroup>
              <thead>
                <tr style={{background:AGEL.navy}}>
                  <th style={{padding:"6px 10px",textAlign:"left",fontSize:11,color:"rgba(255,255,255,0.75)",fontWeight:700}}>ZAMĚSTNANEC</th>
                  {DAYS.map(d=>(
                    <th key={d} style={{textAlign:"center",fontSize:9,fontWeight:700,color:isWE(d)?"rgba(255,160,160,1)":"rgba(255,255,255,0.6)",padding:"4px 0",background:isWE(d)?"rgba(255,255,255,0.06)":undefined}}>
                      <div>{d}</div><div style={{fontSize:8,opacity:0.7}}>{CS_DAYS[(dow(d)+6)%7]}</div>
                    </th>
                  ))}
                  <th style={{textAlign:"center",fontSize:9,color:"rgba(255,255,255,0.55)",fontWeight:700}}>D</th>
                  <th style={{textAlign:"center",fontSize:9,color:"rgba(255,255,255,0.55)",fontWeight:700}}>N</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s,i)=>(
                  <tr key={s.id} style={{background:i%2===0?AGEL.white:AGEL.gray50,borderBottom:`0.5px solid ${AGEL.gray100}`}}>
                    <td style={{padding:"4px 10px",fontSize:11,fontWeight:700,color:AGEL.navy,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {s.name}
                      {s.email&&<div style={{fontSize:9,fontWeight:400,color:AGEL.gray400}}>{s.email}</div>}
                    </td>
                    {DAYS.map(d=><Cell key={d} val={shifts[s.id][d]} synced={!!synced[`${s.id}_${d}`]} onClick={()=>setPicker({sid:s.id,day:d})}/>)}
                    <td style={{textAlign:"center",fontSize:10,fontWeight:700,color:AGEL.navyMid}}>{cntD(s.id)||""}</td>
                    <td style={{textAlign:"center",fontSize:10,fontWeight:700,color:"#5B4DB3"}}>{cntN(s.id)||""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:AGEL.navyLight,borderTop:`2px solid ${AGEL.navy}`}}>
                  <td style={{padding:"4px 10px",fontSize:10,color:AGEL.navy,fontWeight:700}}>POKRYTÍ</td>
                  {DAYS.map(d=>{
                    const dc=STAFF.filter(s=>shifts[s.id][d]==="D").length
                    const nc=STAFF.filter(s=>shifts[s.id][d]==="N").length
                    return <td key={d} style={{textAlign:"center",padding:"2px 0"}}>
                      <div style={{fontSize:8,fontWeight:700,color:dc===0?"#ccc":dc<2?AGEL.red:AGEL.navyMid}}>{dc>0?`${dc}D`:""}</div>
                      <div style={{fontSize:8,fontWeight:700,color:nc===0?"#ccc":nc<1?AGEL.red:"#5B4DB3"}}>{nc>0?`${nc}N`:""}</div>
                    </td>
                  })}
                  <td/><td/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {tab==="log"&&(
          <div style={{background:AGEL.white,borderRadius:4,border:`1px solid ${AGEL.gray200}`,overflow:"hidden"}}>
            <div style={{background:AGEL.navy,padding:"8px 12px",color:AGEL.white,fontSize:11,fontWeight:700}}>PROTOKOL SYNCHRONIZACE</div>
            {log.length===0
              ?<div style={{padding:"2rem",textAlign:"center",color:AGEL.gray400}}>Zatím žádná aktivita.</div>
              :log.map((l,i)=>(
                <div key={i} style={{padding:"7px 14px",borderBottom:`0.5px solid ${AGEL.gray100}`,display:"flex",gap:10,
                  background:l.type==="success"?"#E6F7F0":l.type==="error"?AGEL.redLight:l.type==="warn"?"#FFF8E1":AGEL.white}}>
                  <span style={{fontSize:10,color:AGEL.gray400,minWidth:65}}>{l.t}</span>
                  <span style={{fontSize:11,color:l.type==="success"?"#065C3A":l.type==="error"?AGEL.red:l.type==="warn"?"#8A5200":AGEL.text}}>{l.msg}</span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}
