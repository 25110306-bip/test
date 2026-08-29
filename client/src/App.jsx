import { useEffect, useMemo, useRef, useState } from 'react';
import { api, setToken } from './api.js';

function Stat({ label, value }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function MiniBar({ label, value }) {
  const width = Math.max(0, Math.min(100, Number(value || 0)));
  return <div className="mini-bar"><span>{label}</span><div><i style={{ width: `${width}%` }} /></div><strong>{Math.round(width)}</strong></div>;
}


function BotCheck({ captcha, setCaptcha, label = 'Xác minh không phải bot' }) {
  const [loading, setLoading] = useState(false);

  async function loadChallenge() {
    try {
      setLoading(true);
      const data = await api('/api/bot/challenge');
      setCaptcha({ token: data.challenge.token, question: data.challenge.question, answer: '', botTrap: '' });
    } catch (err) {
      setCaptcha(prev => ({ ...prev, error: err.message }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadChallenge(); }, []);

  return (
    <div className="bot-check">
      <label>{label}</label>
      <input className="bot-trap" tabIndex="-1" autoComplete="off" value={captcha.botTrap || ''} onChange={e => setCaptcha(prev => ({ ...prev, botTrap: e.target.value }))} placeholder="Không nhập ô này" />
      <div className="inline-form">
        <span className="captcha-question">{loading ? 'Đang tải...' : captcha.question || 'Captcha'}</span>
        <input value={captcha.answer || ''} onChange={e => setCaptcha(prev => ({ ...prev, answer: e.target.value }))} placeholder="Đáp án" inputMode="numeric" />
        <button type="button" className="secondary" onClick={loadChallenge}>Đổi mã</button>
      </div>
      {captcha.error && <small className="danger">{captcha.error}</small>}
    </div>
  );
}

function AuthPanel({ user, onUser }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '', dateOfBirth: '',
    guardianFullName: '', guardianPhone: '', acceptTerms: false, acceptPrivacy: false, acceptDataProcessing: false, marketingConsent: false
  });
  const [otp, setOtp] = useState('');
  const [giftCode, setGiftCode] = useState('');
  const [msg, setMsg] = useState('');
  const [captcha, setCaptcha] = useState({ token: '', question: '', answer: '', botTrap: '' });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const captchaPayload = { captchaToken: captcha.token, captchaAnswer: captcha.answer, botTrap: captcha.botTrap || '' };
      const payload = mode === 'login' ? { email: form.email, password: form.password, ...captchaPayload } : { ...form, ...captchaPayload };
      const data = await api(path, { method: 'POST', body: JSON.stringify(payload) });
      setToken(data.token);
      onUser(data.user);
      setMsg(data.message || 'Thành công');
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    try {
      const data = await api('/api/auth/verify-phone', { method: 'POST', body: JSON.stringify({ code: otp }) });
      onUser(data.user);
      setMsg(data.message);
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function requestOtp() {
    try {
      const data = await api('/api/auth/request-phone-otp', { method: 'POST' });
      setMsg(data.message);
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function claimFreeVotes() {
    try {
      const data = await api('/api/votes/claim-free', { method: 'POST' });
      onUser(data.user);
      setMsg(data.message);
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function oauth(provider) {
    try {
      await api(`/api/auth/oauth/${provider}`);
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function checkIn() {
    try {
      const data = await api('/api/votes/check-in', { method: 'POST' });
      onUser(data.user);
      setMsg(data.message);
    } catch (err) { setMsg(err.message); }
  }

  async function redeemGiftCode(e) {
    e.preventDefault();
    try {
      const data = await api('/api/votes/gift-code', { method: 'POST', body: JSON.stringify({ code: giftCode }) });
      onUser(data.user);
      setGiftCode('');
      setMsg(data.message);
    } catch (err) { setMsg(err.message); }
  }

  if (user) {
    return (
      <section className="card">
        <h2>Tài khoản</h2>
        <p>Xin chào <strong>{user.fullName}</strong></p>
        <div className="row">
          <Stat label="Vàng" value={user.goldBalance} />
          <Stat label="Vé free" value={user.freeVotesBalance || 0} />
          <Stat label="Cấp fan" value={user.fanLevel || 'Fan mới'} />
          <Stat label="Chống bot" value={user.botVerified ? 'Đã kiểm tra' : 'Cơ bản'} />
        </div>
        <p className="notice">Web không bắt buộc OTP/SĐT. Chỉ dùng đăng nhập + captcha cơ bản để hạn chế bot.</p>
        <div className="row">
          <button onClick={claimFreeVotes}>Nhận vé vote hôm nay</button>
          <button className="secondary" onClick={checkIn}>Điểm danh +10 vé</button>
          <button className="secondary" onClick={() => { setToken(null); onUser(null); }}>Đăng xuất</button>
        </div>
        <form className="inline-form" onSubmit={redeemGiftCode}>
          <input value={giftCode} onChange={e => setGiftCode(e.target.value)} placeholder="Nhập gift code: VBIZVIP, VBIZ2026, FANPOWER" />
          <button className="secondary">Đổi code</button>
        </form>
        {msg && <p className="notice">{msg}</p>}
      </section>
    );
  }

  return (
    <section className="card">
      <h2>{mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</h2>
      <form onSubmit={submit} className="grid-form">
        {mode === 'register' && <input value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Họ và tên" />}
        <input value={form.email} onChange={e => update('email', e.target.value)} placeholder="Email" type="email" />
        <input value={form.password} onChange={e => update('password', e.target.value)} placeholder="Mật khẩu" type="password" />
        {mode === 'register' && (
          <>
            <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="Số điện thoại (không bắt buộc)" />
            <label>Ngày sinh<input value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} type="date" /></label>
            <input value={form.guardianFullName} onChange={e => update('guardianFullName', e.target.value)} placeholder="Tên người giám hộ nếu dưới 16 tuổi" />
            <input value={form.guardianPhone} onChange={e => update('guardianPhone', e.target.value)} placeholder="SĐT người giám hộ nếu dưới 16 tuổi" />
            <label className="check"><input type="checkbox" checked={form.acceptTerms} onChange={e => update('acceptTerms', e.target.checked)} /> Tôi đồng ý điều khoản sử dụng</label>
            <label className="check"><input type="checkbox" checked={form.acceptPrivacy} onChange={e => update('acceptPrivacy', e.target.checked)} /> Tôi đồng ý chính sách riêng tư</label>
            <label className="check"><input type="checkbox" checked={form.acceptDataProcessing} onChange={e => update('acceptDataProcessing', e.target.checked)} /> Tôi đồng ý xử lý dữ liệu cá nhân để vận hành tài khoản, nhiệm vụ và bình chọn</label>
            <label className="check"><input type="checkbox" checked={form.marketingConsent} onChange={e => update('marketingConsent', e.target.checked)} /> Nhận thông tin quảng bá</label>
          </>
        )}
        <BotCheck captcha={captcha} setCaptcha={setCaptcha} />
        <button>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
      </form>
      <div className="social-login">
        <button className="secondary" onClick={() => oauth('google')}>Google</button>
        <button className="secondary" onClick={() => oauth('facebook')}>Facebook</button>
        <button className="secondary" onClick={() => oauth('telegram')}>Telegram</button>
      </div>
      <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
      </button>
      {msg && <p className="notice">{msg}</p>}
    </section>
  );
}

function Leaderboard({ user, reloadUser, onSelect, selectedId, refreshKey }) {
  const [artists, setArtists] = useState([]);
  const [filters, setFilters] = useState({ board: 'overall', profession: 'all', gender: 'all', period: 'all', grade: 'all', hashtag: '', q: '' });
  const [sortBy, setSortBy] = useState('score');
  const [msg, setMsg] = useState('');

  function update(key, value) { setFilters(prev => ({ ...prev, [key]: value })); }

  async function load() {
    const params = new URLSearchParams(filters);
    const data = await api(`/api/leaderboards?${params}`);
    setArtists(data.artists);
  }

  useEffect(() => { load().catch(err => setMsg(err.message)); }, [JSON.stringify(filters), refreshKey]);

  const displayedArtists = useMemo(() => {
    const list = [...artists];
    if (sortBy === 'fans') list.sort((a, b) => (b.metrics?.webVotes || 0) - (a.metrics?.webVotes || 0));
    else if (sortBy === 'buzz') list.sort((a, b) => (b.scoreBreakdown?.buzz || 0) - (a.scoreBreakdown?.buzz || 0));
    else if (sortBy === 'achievement') list.sort((a, b) => (b.scoreBreakdown?.achievement || 0) - (a.scoreBreakdown?.achievement || 0));
    else list.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));
    return list.map((artist, index) => ({ ...artist, rank: index + 1 }));
  }, [artists, sortBy]);

  async function vote(artistId, amount = 1, source = 'gold') {
    try {
      const data = await api('/api/votes', { method: 'POST', body: JSON.stringify({ artistId, amount, category: 'overall', source }) });
      setMsg(`${data.message} Còn ${data.goldBalance} vàng, ${data.freeVotesBalance} vé free.`);
      await Promise.all([load(), reloadUser()]);
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <section className="card wide">
      <div className="section-head">
        <div>
          <p className="eyebrow dark">Ranking Engine</p>
          <h2>Bảng xếp hạng đa chiều</h2>
        </div>
      </div>
      <div className="filters">
        <select value={filters.board} onChange={e => update('board', e.target.value)}>
          <option value="overall">BXH Tổng hợp</option>
          <option value="breakout">Breakout / Radar</option>
          <option value="hall_of_fame">Hall of Fame</option>
        </select>
        <select value={filters.profession} onChange={e => update('profession', e.target.value)}>
          <option value="all">Tất cả nghề</option>
          <option value="singer">Ca sĩ</option>
          <option value="actor">Diễn viên</option>
          <option value="rapper">Rapper</option>
          <option value="dancer">Dancer</option>
          <option value="group">Nhóm nhạc</option>
        </select>
        <select value={filters.gender} onChange={e => update('gender', e.target.value)}>
          <option value="all">Tất cả giới tính</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="group">Nhóm</option>
        </select>
        <select value={filters.period} onChange={e => update('period', e.target.value)}>
          <option value="all">Tổng hợp</option>
          <option value="day">Ngày real-time</option>
          <option value="week">Tuần trending</option>
          <option value="month">Tháng</option>
          <option value="year">Năm</option>
        </select>
        <select value={filters.grade} onChange={e => update('grade', e.target.value)}>
          <option value="all">Mọi hạng</option>
          <option value="S">Hạng S</option>
          <option value="A">Hạng A</option>
          <option value="B">Hạng B</option>
          <option value="C">Hạng C</option>
        </select>
        <input value={filters.hashtag} onChange={e => update('hashtag', e.target.value)} placeholder="#GenZ, #Diva, #actor" />
        <input value={filters.q} onChange={e => update('q', e.target.value)} placeholder="Tìm nghệ sĩ/tác phẩm" />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="score">Sắp xếp: Tổng điểm</option>
          <option value="fans">Sắp xếp: Fan vote</option>
          <option value="buzz">Sắp xếp: Buzz</option>
          <option value="achievement">Sắp xếp: Thành tích</option>
        </select>
      </div>
      {msg && <p className="notice">{msg}</p>}
      <div className="rank-list">
        {displayedArtists.map(artist => (
          <article key={artist._id} className={`artist ${selectedId === artist._id ? 'selected' : ''}`} onClick={() => onSelect(artist._id)}>
            <div className="rank">#{artist.rank}</div>
            <div className="avatar">{artist.avatarUrl ? <img src={artist.avatarUrl} alt="" /> : artist.stageName.slice(0, 1)}</div>
            <div className="artist-main">
              <h3>{artist.stageName} <small>{artist.grade}</small></h3>
              <p>{artist.trendingReason || artist.bio || 'Chưa có mô tả.'}</p>
              <div className="chips">
                <span>Điểm: {artist.rankScore}</span>
                <span>Fan vote: {artist.scoreBreakdown?.fanVote}</span>
                <span>Thành tích: {artist.scoreBreakdown?.achievement}</span>
                <span>Buzz: {artist.scoreBreakdown?.buzz}</span>
                <span>Chuyên môn: {artist.scoreBreakdown?.expert}</span>
              </div>
            </div>
            <div className="vote-box" onClick={e => e.stopPropagation()}>
              <button disabled={!user} onClick={() => vote(artist._id, 1, 'free_daily')}>Vote free</button>
              <button disabled={!user} onClick={() => vote(artist._id, 5, 'gold')}>Vote 5 vàng</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ArtistProfile({ artistId, user, reloadUser }) {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [msg, setMsg] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrText, setAiPrText] = useState('');
  const [aiPosterUrl, setAiPosterUrl] = useState('');
  const [fandomLoading, setFandomLoading] = useState('');
  const canvasRef = useRef(null);

  async function load() {
    if (!artistId) return;
    const payload = await api(`/api/artists/${artistId}`);
    setData(payload);
  }

  useEffect(() => { load().catch(err => setMsg(err.message)); }, [artistId]);

  async function postWall(e) {
    e.preventDefault();
    try {
      const res = await api(`/api/artists/${artistId}/wall`, { method: 'POST', body: JSON.stringify({ message }) });
      setMsg(res.message);
      setMessage('');
      await Promise.all([load(), reloadUser()]);
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function analyzeWithAi() {
    try {
      setAiLoading(true);
      const res = await api(`/api/ai/artists/${artistId}/analyze`, { method: 'POST' });
      setData(prev => ({ ...(prev || {}), artist: res.artist || prev?.artist }));
      setMsg(res.message);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function generateFanPr() {
    try {
      setFandomLoading('pr');
      const res = await api(`/api/ai/artists/${artistId}/fan-pr`, { method: 'POST' });
      setAiPrText(res.text);
      setMsg(res.message);
    } catch (err) { setMsg(err.message); }
    finally { setFandomLoading(''); }
  }

  async function generatePoster() {
    try {
      setFandomLoading('poster');
      const res = await api(`/api/ai/artists/${artistId}/poster`, { method: 'POST' });
      setAiPosterUrl(res.imageUrl);
      setMsg(res.message);
    } catch (err) { setMsg(err.message); }
    finally { setFandomLoading(''); }
  }

  async function copyPr() {
    try {
      await navigator.clipboard.writeText(aiPrText);
      setMsg('Đã sao chép bài PR fandom.');
    } catch { setMsg('Không sao chép được, bạn hãy bôi đen và copy thủ công.'); }
  }

  function generateCard() {
    const artist = data?.artist;
    const canvas = canvasRef.current;
    if (!artist || !canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 1080;
    canvas.height = 1350;
    const g = ctx.createLinearGradient(0, 0, 1080, 1350);
    g.addColorStop(0, '#14151f');
    g.addColorStop(1, '#4c2cff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = '#fff';
    ctx.font = '900 76px Arial';
    ctx.fillText('VIET RANK', 80, 140);
    ctx.font = '900 118px Arial';
    ctx.fillText(`#${artist.rank || '?'}`, 80, 360);
    ctx.font = '900 86px Arial';
    ctx.fillText(artist.stageName, 80, 480);
    ctx.font = '700 44px Arial';
    ctx.fillText(`Điểm tổng: ${artist.rankScore}`, 80, 580);
    ctx.fillText(`Fan Vote: ${artist.scoreBreakdown?.fanVote} · Buzz: ${artist.scoreBreakdown?.buzz}`, 80, 660);
    ctx.fillText('Vote ngay để đưa idol lên top!', 80, 1190);
    ctx.fillText(window.location.origin, 80, 1260);
    setMsg('Đã tạo card. Chuột phải vào ảnh canvas để lưu hoặc chụp màn hình.');
  }

  if (!artistId) return <section className="card"><h2>Hồ sơ nghệ sĩ</h2><p>Chọn một nghệ sĩ trong bảng xếp hạng để xem chi tiết.</p></section>;
  if (!data) return <section className="card"><h2>Hồ sơ nghệ sĩ</h2><p>Đang tải...</p>{msg && <p className="notice">{msg}</p>}</section>;

  const { artist, wall } = data;
  const works = artist.works || [];
  const awards = artist.awards || [];

  return (
    <section className="card profile">
      <div className="profile-head">
        <div className="avatar big">{artist.avatarUrl ? <img src={artist.avatarUrl} alt="" /> : artist.stageName.slice(0, 1)}</div>
        <div>
          <p className="eyebrow dark">Star Profile</p>
          <h2>{artist.stageName} {artist.aiGenerated && <small className="ai-badge">AI đánh giá</small>}</h2>
          <p>{artist.bio}</p>
          <div className="chips">{(artist.hashtags || []).map(tag => <span key={tag}>#{tag}</span>)}</div>
        </div>
      </div>
      <div className="row">
        <Stat label="Công ty" value={artist.company || 'Chưa rõ'} />
        <Stat label="Nghề" value={artist.primaryProfession} />
        <Stat label="Hạng" value={artist.grade} />
        <Stat label="Điểm" value={artist.rankScore} />
      </div>
      <div className="radar-grid">
        {Object.entries(artist.skills || {}).map(([key, value]) => <MiniBar key={key} label={key} value={value} />)}
      </div>
      <div className="section-head">
        <h3>AI phân tích</h3>
        <button className="secondary" disabled={!user || aiLoading} onClick={analyzeWithAi}>{aiLoading ? 'AI đang phân tích...' : 'Phân tích bằng AI'}</button>
      </div>
      {artist.aiAnalysis ? (
        <div className="ai-panel">
          <p>{artist.aiAnalysis.summary}</p>
          <div className="ai-columns">
            <div><strong>Điểm mạnh</strong><ul>{(artist.aiAnalysis.strengths || []).map(x => <li key={x}>{x}</li>)}</ul></div>
            <div><strong>Rủi ro/cần kiểm chứng</strong><ul>{(artist.aiAnalysis.risks || []).map(x => <li key={x}>{x}</li>)}</ul></div>
          </div>
          <p><strong>Gợi ý:</strong> {artist.aiAnalysis.recommendation}</p>
          <small>Độ tin cậy AI: {artist.aiAnalysis.confidence || 0}/100</small>
        </div>
      ) : <p className="notice">Bấm “Phân tích bằng AI” để AI đọc điểm vote, thành tích, buzz và kỹ năng của nghệ sĩ.</p>}
      <div className="fandom-ai">
        <div className="section-head">
          <h3>Trợ lý Fandom AI</h3>
          <div className="row compact-row">
            <button className="secondary" disabled={!user || fandomLoading === 'pr'} onClick={generateFanPr}>{fandomLoading === 'pr' ? 'Đang viết...' : 'Viết bài PR'}</button>
            <button className="secondary" disabled={!user || fandomLoading === 'poster'} onClick={generatePoster}>{fandomLoading === 'poster' ? 'Đang vẽ...' : 'Vẽ poster'}</button>
          </div>
        </div>
        {aiPrText && <div className="ai-output"><p>{aiPrText}</p><button className="secondary" onClick={copyPr}>Copy bài PR</button></div>}
        {aiPosterUrl && <img className="ai-poster" src={aiPosterUrl} alt="Poster fandom AI" />}
      </div>
      <h3>Tác phẩm nổi bật</h3>
      <div className="work-list">
        {works.map(work => <div key={work._id || work.title} className="work"><strong>{work.title}</strong><span>{work.kind} · Impact {work.impactScore || 0}</span></div>)}
      </div>
      <h3>Giải thưởng / Chuyên môn</h3>
      <div className="chips">{awards.length ? awards.map(a => <span key={a._id || a.name}>{a.name} {a.year ? `(${a.year})` : ''}</span>) : <span>Chưa có dữ liệu</span>}</div>
      <h3>Timeline / Lý do đang hot</h3>
      <p className="notice">{artist.trendingReason || 'Chưa có lý do trending.'}</p>
      <div className="timeline">{(artist.timeline || []).map(item => <div key={item._id || item.title}><strong>{item.title}</strong><p>{item.description}</p></div>)}</div>
      <div className="section-head"><h3>Fan Wall</h3><button className="secondary" onClick={generateCard}>Generate Card</button></div>
      <form onSubmit={postWall} className="inline-form">
        <textarea disabled={!user} value={message} onChange={e => setMessage(e.target.value)} placeholder="Gửi lời chúc tới nghệ sĩ..." />
        <button disabled={!user}>Gửi</button>
      </form>
      <canvas ref={canvasRef} className="share-canvas" />
      <div className="wall-list">{wall?.map(item => <p key={item._id}><strong>{item.userId?.fullName || 'Fan'}:</strong> <span dangerouslySetInnerHTML={{ __html: item.message }} /></p>)}</div>
      {msg && <p className="notice">{msg}</p>}
    </section>
  );
}

function CompareBox({ artists }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState('');

  async function compare() {
    try {
      const data = await api(`/api/compare?a=${a}&b=${b}`);
      setResult(data.artists);
      setMsg('');
    } catch (err) { setMsg(err.message); }
  }

  return (
    <section className="card">
      <h2>VS Mode</h2>
      <div className="inline-form">
        <select value={a} onChange={e => setA(e.target.value)}><option value="">Chọn nghệ sĩ A</option>{artists.map(x => <option key={x._id} value={x._id}>{x.stageName}</option>)}</select>
        <select value={b} onChange={e => setB(e.target.value)}><option value="">Chọn nghệ sĩ B</option>{artists.map(x => <option key={x._id} value={x._id}>{x.stageName}</option>)}</select>
        <button onClick={compare} disabled={!a || !b || a === b}>So sánh</button>
      </div>
      {result && <div className="vs-result">{result.map(item => <div key={item._id} className="vs-card"><h3>{item.stageName}</h3><MiniBar label="Tổng" value={item.rankScore} /><MiniBar label="Hát" value={item.radar.vocal} /><MiniBar label="Rap" value={item.radar.rap} /><MiniBar label="Nhảy" value={item.radar.dance} /><MiniBar label="Diễn" value={item.radar.acting} /><MiniBar label="Buzz" value={item.bars.buzz} /></div>)}</div>}
      {msg && <p className="notice">{msg}</p>}
    </section>
  );
}

function DailyTask({ user, reloadUser }) {
  const [task, setTask] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [proofText, setProofText] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let timer;
    if (task && task.status !== 'completed') timer = setInterval(() => setElapsed(v => v + 1), 1000);
    return () => clearInterval(timer);
  }, [task?._id, task?.status]);

  async function loadTask() {
    try {
      const data = await api('/api/tasks/today');
      setTask(data.task);
      setElapsed(0);
      setMsg('');
    } catch (err) { setMsg(err.message); }
  }

  async function completeTask() {
    try {
      const data = await api(`/api/tasks/${task._id}/complete`, { method: 'POST', body: JSON.stringify({ elapsedSeconds: elapsed, proofText }) });
      setTask(data.task);
      setMsg(data.message);
      await reloadUser();
    } catch (err) { setMsg(err.message); }
  }

  if (!user) return <section className="card"><h2>Nhiệm vụ hằng ngày</h2><p>Đăng nhập để nhận nhiệm vụ, vàng và vé vote.</p></section>;
  return (
    <section className="card">
      <h2>Nhiệm vụ hằng ngày</h2>
      {!task ? <button onClick={loadTask}>Nhận nhiệm vụ ngẫu nhiên</button> : (
        <div>
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <p>Thưởng: <strong>{task.rewardGold}</strong> vàng · Tối thiểu: <strong>{task.minimumSeconds}</strong> giây · Đã mở: <strong>{elapsed}</strong> giây</p>
          {task.targetUrl && <a href={task.targetUrl} target="_blank" rel="noreferrer">Mở nhiệm vụ</a>}
          <textarea value={proofText} onChange={e => setProofText(e.target.value)} placeholder="Ghi lại tên bài/nghệ sĩ hoặc điều bạn tìm hiểu được" />
          <button disabled={task.status === 'completed'} onClick={completeTask}>Hoàn thành</button>
        </div>
      )}
      {msg && <p className="notice">{msg}</p>}
    </section>
  );
}

function BattleBox({ user, reloadUser }) {
  const [events, setEvents] = useState([]);
  const [active, setActive] = useState(null);
  const [msg, setMsg] = useState('');

  async function load() {
    const data = await api('/api/battles');
    setEvents(data.events);
    if (data.events[0]) {
      const detail = await api(`/api/battles/${data.events[0].slug}`);
      setActive(detail);
    }
  }
  useEffect(() => { load().catch(err => setMsg(err.message)); }, []);

  async function vote(artistId) {
    try {
      const data = await api('/api/votes', { method: 'POST', body: JSON.stringify({ artistId, battleEventId: active.event._id, amount: 1, source: 'free_daily' }) });
      setMsg(data.message);
      await Promise.all([load(), reloadUser()]);
    } catch (err) { setMsg(err.message); }
  }

  return (
    <section className="card">
      <h2>Đại chiến Fandom</h2>
      {active ? <>
        <p><strong>{active.event.title}</strong></p>
        <p>{active.event.description}</p>
        <div className="battle-list">{active.artists.map(artist => <div key={artist._id} className="battle-row"><span>#{artist.rank} {artist.stageName}</span><strong>{artist.weightedVotes} vote</strong><button disabled={!user} onClick={() => vote(artist._id)}>Vote</button></div>)}</div>
      </> : <p>Chưa có event đang hiển thị.</p>}
      {events.length > 1 && <div className="chips">{events.map(e => <span key={e._id}>{e.title}</span>)}</div>}
      {msg && <p className="notice">{msg}</p>}
    </section>
  );
}


function AiIdolBox({ user, onAdded }) {
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('singer');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState({ token: '', question: '', answer: '', botTrap: '' });

  async function submit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setMsg('');
      const data = await api('/api/ai/add-idol', { method: 'POST', body: JSON.stringify({ name, profession, captchaToken: captcha.token, captchaAnswer: captcha.answer, botTrap: captcha.botTrap || '' }) });
      setMsg(data.message);
      setName('');
      if (data.user) onAdded(data.artist, data.user);
      else onAdded(data.artist);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card ai-request">
      <h2>Thêm idol bằng AI</h2>
      <p>Không thấy idol trên BXH? Nhập tên, AI sẽ tự phân tích, chấm điểm và thêm thẳng vào BXH, không cần admin duyệt.</p>
      <form onSubmit={submit} className="grid-form compact">
        <input disabled={!user || loading} value={name} onChange={e => setName(e.target.value)} placeholder="Tên idol, ca sĩ, diễn viên..." />
        <select disabled={!user || loading} value={profession} onChange={e => setProfession(e.target.value)}>
          <option value="singer">Ca sĩ</option>
          <option value="rapper">Rapper</option>
          <option value="actor">Diễn viên</option>
          <option value="group">Nhóm nhạc</option>
          <option value="multi">Đa năng</option>
        </select>
        <BotCheck captcha={captcha} setCaptcha={setCaptcha} label="Captcha trước khi đề xuất idol" />
        <button disabled={!user || loading}>{loading ? 'AI đang phân tích...' : 'AI phân tích & thêm ngay'}</button>
      </form>
      {!user && <p className="notice">Cần đăng nhập trước khi đề xuất idol.</p>}
      {msg && <p className="notice">{msg}</p>}
    </section>
  );
}

function LegalBox() {
  return (
    <section className="card legal">
      <h2>Nguyên tắc vận hành</h2>
      <p>Tài khoản không bắt buộc xác minh SĐT/OTP; web dùng captcha cơ bản, rate limit và kiểm duyệt để hạn chế bot/spam.</p>
      <p>Vàng là điểm nội bộ, không rút, không đổi tiền/quà/thẻ, không chuyển giữa người dùng và không dùng cơ chế may rủi.</p>
      <p>Dữ liệu cá nhân có consent; người dưới 16 tuổi cần thông tin người giám hộ.</p>
    </section>
  );
}

function AdminMini({ user }) {
  const [stats, setStats] = useState(null);
  const [syncMsg, setSyncMsg] = useState('');
  const isAdmin = user?.roles?.includes('admin');
  if (!isAdmin) return null;

  async function loadStats() {
    const data = await api('/api/admin/stats');
    setStats(data);
  }
  async function syncMock() {
    try {
      const data = await api('/api/integrations/sync-mock', { method: 'POST' });
      setSyncMsg(data.message);
      await loadStats();
    } catch (err) { setSyncMsg(err.message); }
  }

  return <section className="card"><h2>Admin Dashboard</h2><button onClick={loadStats}>Tải thống kê</button><button className="secondary" onClick={syncMock}>Mock AI/API Sync</button>{stats && <div className="row"><Stat label="Users" value={stats.users} /><Stat label="Artists" value={stats.artists} /><Stat label="Votes" value={stats.votes} /><Stat label="Reports" value={stats.openReports} /></div>}{syncMsg && <p className="notice">{syncMsg}</p>}</section>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [allArtists, setAllArtists] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  async function reloadUser() {
    try {
      const data = await api('/api/auth/me');
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    }
  }

  async function loadAllArtists() {
    const data = await api('/api/leaderboards?limit=100');
    setAllArtists(data.artists);
    if (!selectedArtistId && data.artists[0]) setSelectedArtistId(data.artists[0]._id);
  }

  async function handleAiArtistAdded(artist, nextUser) {
    if (nextUser) setUser(nextUser);
    if (artist?._id) setSelectedArtistId(artist._id);
    setRefreshKey(v => v + 1);
    await loadAllArtists();
  }

  useEffect(() => {
    Promise.all([reloadUser(), loadAllArtists()]).finally(() => setReady(true));
  }, []);

  const goldText = useMemo(() => user ? `${user.goldBalance} vàng · ${user.freeVotesBalance || 0} vé` : 'Khách', [user]);

  if (!ready) return <main className="page"><p>Đang tải...</p></main>;

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Viet Rank</p>
          <h1>Xếp hạng ca sĩ, rapper, nhóm nhạc và diễn viên Việt Nam</h1>
          <p>Ranking đa chiều từ Fan Vote, thành tích YouTube/Spotify/phòng vé, Buzz truyền thông và điểm chuyên môn. Có VS Mode, Fan Wall, Fandom Battles, nhiệm vụ hằng ngày và vàng nội bộ.</p>
        </div>
        <div className="wallet">{goldText}</div>
      </header>
      <div className="layout">
        <div className="side">
          <AuthPanel user={user} onUser={setUser} />
          <DailyTask user={user} reloadUser={reloadUser} />
          <BattleBox user={user} reloadUser={reloadUser} />
          <AiIdolBox user={user} onAdded={handleAiArtistAdded} />
          <CompareBox artists={allArtists} />
          <AdminMini user={user} />
          <LegalBox />
        </div>
        <div className="main-col">
          <Leaderboard user={user} reloadUser={reloadUser} onSelect={setSelectedArtistId} selectedId={selectedArtistId} refreshKey={refreshKey} />
          <ArtistProfile artistId={selectedArtistId} user={user} reloadUser={reloadUser} />
        </div>
      </div>
    </main>
  );
}
