import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './lib/supabase';

type Candidate = Record<string, any>;
type Rating = {
  id: string;
  candidate_key: string;
  candidate_name: string;
  reviewer_name: string;
  rating: number;
  feedback: string;
  created_at: string;
};

const getCandidateKey = (candidate: Candidate) => String(candidate.phone || candidate.email || candidate.fullName);
const formatRatingDate = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function StarRating({ value, onChange, interactive = false }: { value: number; onChange?: (rating: number) => void; interactive?: boolean }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} text-2xl leading-none transition-transform ${star <= value ? 'text-amber-400' : 'text-gray-300'}`}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function RatingPanel({ candidate, onClose }: { candidate: Candidate; onClose: () => void }) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [reviewerName, setReviewerName] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const candidateKey = getCandidateKey(candidate);

  const loadRatings = async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('candidate_ratings')
      .select('id, candidate_key, candidate_name, reviewer_name, rating, feedback, created_at')
      .eq('candidate_key', candidateKey)
      .order('created_at', { ascending: false });
    if (loadError) setError('Ratings could not be loaded. Please try again.');
    else setRatings((data || []) as Rating[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadRatings();
  }, [candidateKey]);

  const average = ratings.length ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length : 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewerName.trim() || rating === 0) {
      setError('Please enter your name and select a star rating.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: saveError } = await supabase.from('candidate_ratings').insert({
      candidate_key: candidateKey,
      candidate_name: candidate.fullName || 'Unnamed candidate',
      reviewer_name: reviewerName.trim(),
      rating,
      feedback: feedback.trim(),
    });
    if (saveError) setError('Your rating could not be saved. Please try again.');
    else {
      setReviewerName('');
      setRating(0);
      setFeedback('');
      await loadRatings();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label={`Ratings for ${candidate.fullName}`}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Candidate feedback</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">{candidate.fullName || 'Unnamed candidate'}</h2>
            <div className="mt-3 flex items-center gap-3">
              <StarRating value={Math.round(average)} />
              <span className="font-semibold text-gray-900">{average ? average.toFixed(1) : '—'} / 5</span>
              <span className="text-sm text-gray-500">{ratings.length} {ratings.length === 1 ? 'review' : 'reviews'}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-2xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="Close ratings">×</button>
        </div>

        <div className="space-y-3 p-6">
          <h3 className="font-semibold text-gray-900">All feedback</h3>
          {loading ? <p className="text-sm text-gray-500">Loading ratings…</p> : ratings.length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">No ratings yet. Be the first recruiter to review this candidate.</p> : ratings.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3"><StarRating value={item.rating} /><span className="font-semibold text-gray-900">{item.rating}.0</span></div>
                <time className="text-sm text-gray-500">{formatRatingDate(item.created_at)}</time>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-700">By {item.reviewer_name}</p>
              {item.feedback && <p className="mt-2 text-sm leading-6 text-gray-600">{item.feedback}</p>}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900">Add your feedback</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">Your name<input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 p-3 font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" placeholder="Recruiter name" maxLength={120} required /></label>
            <div><span className="text-sm font-medium text-gray-700">Your rating</span><div className="mt-2"><StarRating value={rating} onChange={setRating} interactive /></div></div>
          </div>
          <label className="mt-4 block text-sm font-medium text-gray-700">Feedback (optional)<textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} className="mt-1 min-h-24 w-full resize-y rounded-lg border border-gray-300 p-3 font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" placeholder="Share your experience with this candidate" maxLength={2000} /></label>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="mt-4 rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving…' : 'Submit rating'}</button>
        </form>
      </div>
    </div>
  );
}


type FormState = 'aadhar' | 'details';

function CandidateOnboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "Aarav Sharma", dob: "15-05-1994", address: "42, Residency Road", city: "Bangalore", state: "Karnataka", pin: "560025",
    houseName: "", area: "", skills: "", preferredLocationList: [] as string[],
    phone: "", email: "", pan: "", qualification: "", experience: "", preferredLocation: "", 
    accountNumber: "", reconfirmAccountNumber: "", ifsc: "", resume: ""
  });

  const [panVerified, setPanVerified] = useState<boolean | null>(null);
  const [bankVerified, setBankVerified] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState({ pan: false, bank: false });
  
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneOtpValue, setPhoneOtpValue] = useState('');
  const [emailOtpValue, setEmailOtpValue] = useState('');
  const [phoneTimer, setPhoneTimer] = useState(0);
  const [emailTimer, setEmailTimer] = useState(0);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [onboardingSubStep, setOnboardingSubStep] = useState(0); // 0: Input, 1: Phone OTP, 2: Email OTP

  const handlePhoneEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
        setPhoneError('Invalid phone number format');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setEmailError('Invalid email format');
        return;
    }
    setPhoneError('');
    setEmailError('');
    setOnboardingSubStep(1); // Go to Phone OTP
  };

  const handlePhoneOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneOtpValue !== '1234') {
        setPhoneError('Wrong OTP');
        return;
    }
    setPhoneError('');
    setOnboardingSubStep(2); // Go to Email OTP
  };

  const handleEmailOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOtpValue !== '1234') {
        setEmailError('Wrong OTP');
        return;
    }
    setEmailError('');
    setStep(2); // Go to next main step
  };

  useEffect(() => {
    let pInt: any, eInt: any;
    if (phoneTimer > 0) pInt = setInterval(() => setPhoneTimer(t => t - 1), 1000);
    if (emailTimer > 0) eInt = setInterval(() => setEmailTimer(t => t - 1), 1000);
    return () => { clearInterval(pInt); clearInterval(eInt); };
  }, [phoneTimer, emailTimer]);

  const resendPhoneOtp = () => { setPhoneTimer(45); alert('Phone OTP resent!'); };
  const resendEmailOtp = () => { setEmailTimer(45); alert('Email OTP resent!'); };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    
    // Phone validation
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
        setPhoneError('Invalid phone number format');
        valid = false;
    } else if (phoneOtpValue !== '1234') { 
        setPhoneError('Wrong OTP'); 
        valid = false; 
    } else {
        setPhoneError('');
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setEmailError('Invalid email format');
        valid = false;
    } else if (emailOtpValue !== '1234') { 
        setEmailError('Wrong OTP'); 
        valid = false; 
    } else {
        setEmailError('');
    }
    
    if (valid) setStep(2);
  };

  const verifyPan = async () => {
    setVerifying(v => ({...v, pan: true}));
    await new Promise(resolve => setTimeout(resolve, 1000));
    setPanVerified(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan));
    setVerifying(v => ({...v, pan: false}));
  };

  const verifyBank = async () => {
    setVerifying(v => ({...v, bank: true}));
    await new Promise(resolve => setTimeout(resolve, 1500));
    setBankVerified(formData.accountNumber.length > 8 && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc));
    setVerifying(v => ({...v, bank: false}));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({...formData, resume: e.target.files[0].name});
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!panVerified) { alert("Please verify PAN first."); return; }
    if (!bankVerified) { alert("Please verify Bank Account first."); return; }
    if (formData.accountNumber !== formData.reconfirmAccountNumber) {
        alert("Account numbers do not match.");
        return;
    }
    localStorage.setItem(`candidate_${formData.phone}`, JSON.stringify(formData));
    alert('Information Saved Successfully!');
  };

  return (
    <>
      <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-between bg-gray-50">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">You are a minute away from your dream job!</h1>
          <p className="text-gray-600">Join our network and find your next opportunity.</p>
        </div>
      </div>
      <div className="w-full md:w-1/2 p-8 md:p-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Candidate Onboarding - Step {step} of 3</h2>
        
        {step === 1 && onboardingSubStep === 0 && (
          <form onSubmit={handlePhoneEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number*</label>
              <input type="tel" value={formData.phone} maxLength={10} onChange={e => { setFormData({...formData, phone: e.target.value}); setPhoneError(''); }} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email*</label>
              <input type="email" value={formData.email} onChange={e => { setFormData({...formData, email: e.target.value}); setEmailError(''); }} className="w-full border p-2 rounded" required />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-md font-semibold mt-4">Send OTP</button>
          </form>
        )}

        {step === 1 && onboardingSubStep === 1 && (
          <form onSubmit={handlePhoneOtpSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold">Verify Phone OTP</h3>
            <p className="text-sm text-gray-600">OTP sent to {formData.phone}</p>
            <input type="text" onChange={(e) => { setPhoneOtpValue(e.target.value); setPhoneError(''); }} placeholder="Enter Phone OTP (1234)" className="w-full border p-2 rounded" required />
            {phoneError && <p className="text-red-600 text-sm">{phoneError}</p>}
            <button type="button" onClick={resendPhoneOtp} disabled={phoneTimer > 0} className="text-sm text-blue-600 underline">{phoneTimer > 0 ? `Resend Phone OTP in ${phoneTimer}s` : 'Resend Phone OTP'}</button>
            <div className="flex gap-2">
                <button type="button" onClick={() => setOnboardingSubStep(0)} className="w-1/2 bg-gray-300 p-2 rounded">Back</button>
                <button type="submit" className="w-1/2 bg-blue-600 text-white p-2 rounded">Verify</button>
            </div>
          </form>
        )}

        {step === 1 && onboardingSubStep === 2 && (
          <form onSubmit={handleEmailOtpSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold">Verify Email OTP</h3>
            <p className="text-sm text-gray-600">OTP sent to {formData.email}</p>
            <input type="text" onChange={(e) => { setEmailOtpValue(e.target.value); setEmailError(''); }} placeholder="Enter Email OTP (1234)" className="w-full border p-2 rounded" required />
            {emailError && <p className="text-red-600 text-sm">{emailError}</p>}
            <button type="button" onClick={resendEmailOtp} disabled={emailTimer > 0} className="text-sm text-blue-600 underline">{emailTimer > 0 ? `Resend Email OTP in ${emailTimer}s` : 'Resend Email OTP'}</button>
            <div className="flex gap-2">
                <button type="button" onClick={() => setOnboardingSubStep(1)} className="w-1/2 bg-gray-300 p-2 rounded">Back</button>
                <button type="submit" className="w-1/2 bg-blue-600 text-white p-2 rounded">Verify</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            if ((formData.preferredLocationList || []).length === 0) {
                alert("Please add at least one preferred location.");
                return;
            }
            setStep(3); 
          }} className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div><label className="block text-sm font-medium text-gray-700">Full Name*</label><input placeholder="Full Name" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full border p-2 rounded" required /></div>
            <div><label className="block text-sm font-medium text-gray-700">Date of Birth*</label><input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full border p-2 rounded" required /></div>
            <div><label className="block text-sm font-medium text-gray-700">Flat/House/Building Name*</label><input placeholder="Flat/House/Building Name" value={formData.houseName || ''} onChange={e => setFormData({...formData, houseName: e.target.value})} className="w-full border p-2 rounded" required /></div>
            <div><label className="block text-sm font-medium text-gray-700">Area/Sector/Locality*</label><input placeholder="Area/Sector/Locality" value={formData.area || ''} onChange={e => setFormData({...formData, area: e.target.value})} className="w-full border p-2 rounded" required /></div>
            <div><label className="block text-sm font-medium text-gray-700">PIN*</label><input placeholder="PIN" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} className="w-full border p-2 rounded" required /></div>
            <div><label className="block text-sm font-medium text-gray-700">City*</label><input placeholder="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full border p-2 rounded" required /></div>
            <div><label className="block text-sm font-medium text-gray-700">State*</label><input placeholder="State" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full border p-2 rounded" required /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Preferred Locations (up to 10)*</label>
              <div className="w-full border p-2 rounded flex flex-wrap gap-2">
                {(formData.preferredLocationList || []).map((loc, i) => (
                  <span key={i} className="bg-gray-100 text-gray-800 px-2 py-1 rounded flex items-center text-sm border border-gray-300">
                    <button type="button" onClick={() => setFormData({...formData, preferredLocationList: formData.preferredLocationList.filter((_, idx) => idx !== i)})} className="mr-1 text-gray-600 font-bold">×</button>
                    {loc}
                  </span>
                ))}
                {(formData.preferredLocationList || []).length < 10 && (
                  <input
                    placeholder="Type and press Enter"
                    className="flex-grow outline-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val && !(formData.preferredLocationList || []).includes(val)) {
                          setFormData({...formData, preferredLocationList: [...(formData.preferredLocationList || []), val]});
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700">Skills</label><input placeholder="Skills (Optional)" value={formData.skills || ''} onChange={e => setFormData({...formData, skills: e.target.value})} className="w-full border p-2 rounded" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Highest Qualification*</label><select value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} className="w-full border p-2 rounded" required>
              <option value="">Select Qualification</option><option value="12th">12th</option><option value="UG">UG</option><option value="PG">PG</option>
            </select></div>
            <div><label className="block text-sm font-medium text-gray-700">Total Years of Audit Experience*</label><input type="number" placeholder="Total Years of Experience" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} className="w-full border p-2 rounded" required /></div>
            <div><label className="block text-sm font-medium text-gray-700">Resume*</label><input type="file" onChange={handleFileChange} className="w-full border p-2 rounded" required /></div>
            <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="w-1/2 bg-gray-300 p-2 rounded">Back</button>
                <button type="submit" className="w-1/2 bg-blue-600 text-white p-2 rounded">Next</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold">Documents & Bank Details</h3>
            <input placeholder="Aadhar" className="w-full border p-2 rounded" required />
            <input placeholder="PAN" value={formData.pan} onChange={e => setFormData({...formData, pan: e.target.value})} className="w-full border p-2 rounded" required />
            <button type="button" onClick={verifyPan} className="w-full bg-gray-600 text-white p-2 rounded">Verify PAN {verifying.pan ? '(Checking...)' : panVerified === true ? '✅' : panVerified === false ? '❌' : ''}</button>
            
            <input placeholder="Account Number" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full border p-2 rounded" required />
            <input placeholder="Reconfirm Account Number" value={formData.reconfirmAccountNumber} onChange={e => setFormData({...formData, reconfirmAccountNumber: e.target.value})} className="w-full border p-2 rounded" required />
            <input placeholder="IFSC" value={formData.ifsc} onChange={e => setFormData({...formData, ifsc: e.target.value})} className="w-full border p-2 rounded" required />
            <button type="button" onClick={verifyBank} className="w-full bg-gray-600 text-white p-2 rounded">Verify Bank {verifying.bank ? '(Checking...)' : bankVerified === true ? '✅' : bankVerified === false ? '❌' : ''}</button>
            
            <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)} className="w-1/2 bg-gray-300 p-2 rounded">Back</button>
                <button type="submit" disabled={!panVerified || !bankVerified} className={`w-1/2 p-2 rounded ${panVerified && bankVerified ? 'bg-blue-600 text-white' : 'bg-gray-400 text-gray-200'}`}>Submit</button>
            </div>
            {(!panVerified || !bankVerified) && <p className="text-red-500 text-sm">Please verify both PAN and Bank details to submit.</p>}
          </form>
        )}
      </div>
    </>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'candidate' | 'recruiter'>('candidate');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingCandidate, setRatingCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    let hasCandidates = false;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith('candidate_')) {
        hasCandidates = true;
        break;
      }
    }
    if (!hasCandidates) {
      const mockCandidates = [
        { fullName: "Aditya Raj", dob: "15-05-1994", address: "42, Residency Road", city: "Bangalore", state: "Karnataka", pin: "560025", phone: "+91 7397386463", email: "aditya.raj@email.com", pan: "ABCDE1234F", qualification: "B.Tech", experience: "5.5", preferredLocation: "Chennai", accountNumber: "1234567890", reconfirmAccountNumber: "1234567890", ifsc: "IFSC0001", resume: "resume1.pdf" },
        { fullName: "Saurav Sinha", dob: "05-05-1992", address: "456 Avenue", city: "Hyderabad", state: "Telangana", pin: "500001", phone: "+91 9133262129", email: "saurav.sinha@email.com", pan: "FGHIJ5678K", qualification: "MBA", experience: "8.5", preferredLocation: "Hyderabad", accountNumber: "9876543210", reconfirmAccountNumber: "9876543210", ifsc: "IFSC0002", resume: "resume2.pdf" },
        { fullName: "Ritik Dhiman", dob: "10-10-1993", address: "789 Lane", city: "Bangalore", state: "Karnataka", pin: "560001", phone: "+91 9876543210", email: "ritik.dhiman@email.com", pan: "KLMNO9012P", qualification: "MCA", experience: "4.0", preferredLocation: "Bangalore", accountNumber: "1122334455", reconfirmAccountNumber: "1122334455", ifsc: "IFSC0003", resume: "resume3.pdf" },
        { fullName: "Raj Kamal Jaiswal", dob: "15-02-1991", address: "321 Road", city: "Mumbai", state: "Maharashtra", pin: "400001", phone: "+91 8765432109", email: "raj.jaiswal@email.com", pan: "QRSTU3456V", qualification: "B.Com", experience: "6.0", preferredLocation: "Mumbai", accountNumber: "5544332211", reconfirmAccountNumber: "5544332211", ifsc: "IFSC0004", resume: "resume4.pdf" },
        { fullName: "Ankit Srivastava", dob: "20-08-1996", address: "654 Place", city: "Pune", state: "Maharashtra", pin: "411001", phone: "+91 7654321098", email: "ankit.srivastava@email.com", pan: "VWXYZ7890A", qualification: "M.Tech", experience: "2.5", preferredLocation: "Pune", accountNumber: "6677889900", reconfirmAccountNumber: "6677889900", ifsc: "IFSC0005", resume: "resume5.pdf" },
        { fullName: "Mayank Dubey", dob: "12-09-1995", address: "101 Street", city: "Delhi", state: "Delhi", pin: "110001", phone: "+91 9988776655", email: "mayank.dubey@email.com", pan: "ABCDE5678G", qualification: "UG", experience: "3.0", preferredLocation: "Delhi", accountNumber: "1020304050", reconfirmAccountNumber: "1020304050", ifsc: "IFSC0006", resume: "resume6.pdf" }
      ];
      mockCandidates.forEach((c, index) => localStorage.setItem(`candidate_mock${index}`, JSON.stringify(c)));
    }
  }, []);

  const loadCandidates = () => {
    const allCandidates = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('candidate_')) {
        allCandidates.push(JSON.parse(localStorage.getItem(key) || '{}'));
      }
    }
    setCandidates(allCandidates);
  };

  useEffect(() => {
    const loadRatings = async () => {
      const { data } = await supabase
        .from('candidate_ratings')
        .select('id, candidate_key, candidate_name, reviewer_name, rating, feedback, created_at')
        .order('created_at', { ascending: false });
      setRatings((data || []) as Rating[]);
    };
    void loadRatings();
  }, []);

  const ratingSummary = ratings.reduce<Record<string, { average: number; count: number }>>((summary, rating) => {
    const current = summary[rating.candidate_key] || { average: 0, count: 0 };
    current.average = (current.average * current.count + rating.rating) / (current.count + 1);
    current.count += 1;
    summary[rating.candidate_key] = current;
    return summary;
  }, {});

  const [filters, setFilters] = useState({ keyword: '', minExp: '', maxExp: '', location: '', qualification: '', name: '' });
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  const filteredCandidates = candidates.filter(c => {
    return (
      (filters.name === '' || c.fullName.toLowerCase().includes(filters.name.toLowerCase())) &&
      (filters.qualification === '' || c.qualification.toLowerCase().includes(filters.qualification.toLowerCase())) &&
      (filters.location === '' || (c.preferredLocation && c.preferredLocation.toLowerCase().includes(filters.location.toLowerCase()))) &&
      (filters.minExp === '' || parseFloat(c.experience) >= parseFloat(filters.minExp)) &&
      (filters.maxExp === '' || parseFloat(c.experience) <= parseFloat(filters.maxExp))
    );
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="flex border-b">
        <button className={`p-4 ${activeTab === 'candidate' ? 'border-b-2 border-blue-600 font-semibold' : ''}`} onClick={() => setActiveTab('candidate')}>Candidate</button>
        <button className={`p-4 ${activeTab === 'recruiter' ? 'border-b-2 border-blue-600 font-semibold' : ''}`} onClick={() => { setActiveTab('recruiter'); loadCandidates(); }}>Recruiter</button>
      </div>

      {activeTab === 'candidate' ? (
        <div className="flex flex-col md:flex-row">
          <CandidateOnboarding />
        </div>
      ) : selectedCandidate ? (
        <div className="p-8 bg-gray-50 min-h-screen">
          <button onClick={() => setSelectedCandidate(null)} className="mb-4 text-blue-600 underline">← Back to List</button>
          <div className="bg-white border rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-500">
                    {selectedCandidate.fullName ? selectedCandidate.fullName.split(' ').map((n: string) => n[0]).join('') : '?'}
                </div>
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold">{selectedCandidate.fullName}</h2>
                      <button type="button" onClick={() => setRatingCandidate(selectedCandidate)} className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-gray-900 transition hover:bg-amber-100">
                        <span className="text-amber-400">★</span> {ratingSummary[getCandidateKey(selectedCandidate)] ? ratingSummary[getCandidateKey(selectedCandidate)].average.toFixed(1) : 'Rate'}
                      </button>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                        <span>📍 {selectedCandidate.city || 'N/A'}</span>
                        <span>✉️ {selectedCandidate.email} ✅</span>
                        <span>📞 {selectedCandidate.phone} ✅</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Last Active today</p>
                </div>
            </div>
            <div className="flex gap-6 border-b border-gray-200">
                <button className="border-b-2 border-teal-700 pb-2 font-semibold text-teal-700">Info</button>
                <button className="pb-2 text-gray-600">Resume</button>
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-6">
            <div className="mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">👤 About</h3>
                <p className="text-sm text-gray-500 mb-2">No Data Available</p>
                <p className="text-sm mb-4">Date of Birth: {selectedCandidate.dob || 'N/A'}</p>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs text-gray-500">Flat/House/Building Name*</label><p className="p-2 border rounded bg-gray-50">{selectedCandidate.houseName || 'N/A'}</p></div>
                    <div><label className="block text-xs text-gray-500">Area/Sector/Locality*</label><p className="p-2 border rounded bg-gray-50">{selectedCandidate.area || 'N/A'}</p></div>
                    <div><label className="block text-xs text-gray-500">PIN*</label><p className="p-2 border rounded bg-gray-50">{selectedCandidate.pin || 'N/A'}</p></div>
                    <div><label className="block text-xs text-gray-500">City*</label><p className="p-2 border rounded bg-gray-50">{selectedCandidate.city || 'N/A'}</p></div>
                    <div className="col-span-2"><label className="block text-xs text-gray-500">State*</label><p className="p-2 border rounded bg-gray-50">{selectedCandidate.state || 'N/A'}</p></div>
                </div>
            </div>
            <div className="border-t pt-6 mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">💼 Experience</h3>
                <p className="text-sm text-gray-600 mt-2">{selectedCandidate.experience} Years</p>
            </div>
            <div className="border-t pt-6 mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">🎓 Education</h3>
                <p className="text-sm text-gray-500 mt-2">No Data Available</p>
            </div>
            <div className="border-t pt-6 mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">🔑 Key Skills</h3>
                <div className="flex gap-2 mt-2">
                    {(selectedCandidate.skills || '').split(',').map((s: string) => s.trim()).filter(Boolean).map((s: string, i: number) => <span key={i} className="bg-gray-100 px-3 py-1 rounded-full text-xs">{s}</span>)}
                </div>
            </div>
            <div className="border-t pt-6 mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">📂 Job Preferences</h3>
                <p className="text-sm mt-2 font-semibold">Preferred Location</p>
                <div className="flex gap-2 mt-2">
                    {(selectedCandidate.preferredLocationList || []).map((loc: string, i: number) => <span key={i} className="bg-gray-100 px-3 py-1 rounded-full text-xs">{loc}</span>)}
                </div>
            </div>
            <div className="border-t pt-6 mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">💰 CTC</h3>
                <div className="flex gap-8 mt-2 text-sm">
                    <p>Current: No Data Available</p>
                    <p>Expected: No Data Available</p>
                </div>
            </div>
            <div className="border-t pt-6 mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">📋 Projects</h3>
                <p className="text-sm text-gray-500 mt-2">No Data Available</p>
            </div>
            <div className="border-t pt-6 mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">🏆 Achievements</h3>
                <p className="text-sm text-gray-500 mt-2">No Data Available</p>
            </div>
            <div className="border-t pt-6 mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">📜 Certification</h3>
                <p className="text-sm text-gray-500 mt-2">No Data Available</p>
            </div>
            <div className="border-t pt-6">
                <h3 className="text-lg font-bold flex items-center gap-2">🆔 Aadhaar & PAN</h3>
                <div className="flex gap-2 mt-2">
                    <button className="bg-teal-800 text-white px-4 py-2 rounded text-sm">View Aadhaar</button>
                    <button className="bg-teal-800 text-white px-4 py-2 rounded text-sm">View PAN</button>
                    <button className="bg-teal-800 text-white px-4 py-2 rounded text-sm">Bank Details</button>
                </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 min-h-screen flex gap-8">
          <div className="w-64 bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit space-y-4">
            <h3 className="font-bold text-lg mb-4">Filters</h3>
            <input placeholder="Search by Name" className="w-full border p-2 rounded" onChange={e => setFilters({...filters, name: e.target.value})} />
            <input placeholder="Qualification" className="w-full border p-2 rounded" onChange={e => setFilters({...filters, qualification: e.target.value})} />
            <input placeholder="Location" className="w-full border p-2 rounded" onChange={e => setFilters({...filters, location: e.target.value})} />
            <div className="flex gap-2">
                <input placeholder="Min Exp" className="w-1/2 border p-2 rounded" onChange={e => setFilters({...filters, minExp: e.target.value})} />
                <input placeholder="Max Exp" className="w-1/2 border p-2 rounded" onChange={e => setFilters({...filters, maxExp: e.target.value})} />
            </div>
            <div className="border-t pt-4 mt-4">
              <h3 className="font-bold text-lg mb-2">Bulk Add</h3>
              <button onClick={() => {
                const headers = [["fullName", "dob", "address", "city", "state", "pin", "phone", "email", "pan", "qualification", "experience", "preferredLocation", "accountNumber", "reconfirmAccountNumber", "ifsc", "resume"]];
                const ws = XLSX.utils.aoa_to_sheet(headers);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Template");
                XLSX.writeFile(wb, "CandidateTemplate.xlsx");
              }} className="w-full bg-gray-600 text-white p-2 rounded mb-2">Download Template</button>
              <input type="file" onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data: any[] = XLSX.utils.sheet_to_json(ws);
                    data.forEach((c, index) => {
                      localStorage.setItem(`candidate_excel_${index}_${Date.now()}`, JSON.stringify(c));
                    });
                    loadCandidates();
                    alert('Candidates uploaded successfully!');
                  };
                  reader.readAsBinaryString(e.target.files[0]);
                }
              }} className="w-full text-sm" accept=".xlsx, .xls" />
            </div>
          </div>
          <div className="flex-grow">
            <h2 className="text-2xl font-bold mb-6">Candidate List ({filteredCandidates.length})</h2>
            <div className="space-y-4">
              {filteredCandidates.map((c, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex cursor-pointer hover:shadow-md transition" onClick={() => setSelectedCandidate(c)}>
                  <div className="flex-shrink-0 mr-6">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-500">
                      {c.fullName ? c.fullName.split(' ').map((n: string) => n[0]).join('') : '?'}
                    </div>
                  </div>
                  <div className="flex-grow grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900">{c.fullName}</h3>
                        <button type="button" onClick={(event) => { event.stopPropagation(); setRatingCandidate(c); }} className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-gray-900 transition hover:bg-amber-100" aria-label={`View ratings for ${c.fullName}`}>
                          <span className="text-amber-400">★</span> {ratingSummary[getCandidateKey(c)] ? ratingSummary[getCandidateKey(c)].average.toFixed(1) : 'Rate'} {ratingSummary[getCandidateKey(c)] && <span className="text-xs font-normal text-gray-500">({ratingSummary[getCandidateKey(c)].count})</span>}
                        </button>
                      </div>
                      <p className="text-gray-600 flex items-center mt-1">📧 {c.email}</p>
                      <p className="text-gray-600 flex items-center mt-1">📞 {c.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><span className="font-semibold">Qualification:</span> {c.qualification}</p>
                      <p className="text-gray-600"><span className="font-semibold">Experience:</span> {c.experience} Years</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {ratingCandidate && <RatingPanel candidate={ratingCandidate} onClose={() => setRatingCandidate(null)} />}
    </div>
  );
}
