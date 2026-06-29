import { Shield, Heart } from 'lucide-react'

const Facebook = (props) => (
  <svg
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)

const Instagram = (props) => (
  <svg
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

export default function Footer() {
  const contacts = [
    {
      name: 'ชมรมวิชาชีพเทคโนโลยีธุรกิจดิจิทัล',
      sub: 'วิทยาลัยเทคนิคแม่สอด',
      avatar: '/dbt_logo.jpg',
      link: 'https://www.facebook.com/search/top?q=ชมรมวิชาชีพเทคโนโลยีธุรกิจดิจิทัล%20วิทยาลัยเทคนิคแม่สอด'
    },
    {
      name: 'ผู้จัดทำเว็บ (Marshal Mars)',
      sub: 'Marshal Mars (Facebook)',
      avatar: '/marshal_avatar.png',
      link: 'https://www.facebook.com/search/top?q=Marshal%20Mars'
    },
    {
      name: 'ผู้จัดทำเว็บ (Instagram)',
      sub: 'kkhxphidph (Instagram)',
      avatar: '/marshal_avatar.png',
      link: 'https://www.instagram.com/kkhxphidph/',
      isInstagram: true
    },
    {
      name: 'งานประชาสัมพันธ์ วิทยาลัยเทคนิคแม่สอด',
      sub: 'PRMTC. (Facebook)',
      avatar: '/prmtc_logo.png',
      link: 'https://www.facebook.com/search/top?q=งานประชาสัมพันธ์%20วิทยาลัยเทคนิคแม่สอด%20PRMTC'
    }
  ]

  return (
    <footer className="bg-navy-950 text-slate-400 py-12 border-t border-navy-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black font-outfit tracking-wider">
                <span className="text-white">DBT </span>
                <span className="text-sky-400">MAE SOT</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 max-w-sm">
              แพลตฟอร์มตลาดออนไลน์มือสองสำหรับนักเรียน นักศึกษา และบุคลากร วิทยาลัยเทคนิคแม่สอด เพื่ออำนวยความสะดวกในการซื้อขายแลกเปลี่ยนสินค้าภายในสถาบันอย่างปลอดภัย
            </p>
            <div className="text-[10px] text-slate-600 font-mono mt-4 pt-4 border-t border-navy-900/60">
              © {new Date().getFullYear()} DBT MAE SOT. All rights reserved.
            </div>
          </div>

          {/* Contact Info (Separated Sections) */}
          <div className="space-y-6 lg:col-span-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-navy-900 pb-2">
              ช่องทางการติดต่อ / ผู้จัดทำเว็บ
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Facebook Column */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center space-x-1.5 border-b border-navy-900/50 pb-1">
                  <Facebook className="h-3.5 w-3.5 text-sky-400" />
                  <span>Facebook Channels</span>
                </h4>
                <div className="space-y-2">
                  {contacts.filter(c => !c.isInstagram).map((item, idx) => (
                    <a
                      key={idx}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 bg-navy-900/50 hover:bg-navy-900 border border-navy-900 hover:border-sky-500/30 p-3 rounded-xl transition-all duration-300 group shadow-sm"
                    >
                      <div className="w-9 h-9 rounded-full border border-navy-800 bg-slate-950 overflow-hidden shrink-0 shadow-inner">
                        <img 
                          src={item.avatar} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80' }}
                        />
                      </div>
                      <div className="overflow-hidden flex-1">
                        <h5 className="font-bold text-xs text-slate-200 group-hover:text-sky-400 transition-colors truncate">
                          {item.name}
                        </h5>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {item.sub}
                        </p>
                      </div>
                      <Facebook className="h-3.5 w-3.5 text-slate-600 group-hover:text-sky-400 shrink-0 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Instagram Column */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-pink-400 uppercase tracking-widest flex items-center space-x-1.5 border-b border-navy-900/50 pb-1">
                  <Instagram className="h-3.5 w-3.5 text-pink-400" />
                  <span>Instagram Channels</span>
                </h4>
                <div className="space-y-2">
                  {contacts.filter(c => c.isInstagram).map((item, idx) => (
                    <a
                      key={idx}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 bg-navy-900/50 hover:bg-navy-900 border border-navy-900 hover:border-pink-500/30 p-3 rounded-xl transition-all duration-300 group shadow-sm"
                    >
                      <div className="w-9 h-9 rounded-full border border-navy-800 bg-slate-950 overflow-hidden shrink-0 shadow-inner">
                        <img 
                          src={item.avatar} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80' }}
                        />
                      </div>
                      <div className="overflow-hidden flex-1">
                        <h5 className="font-bold text-xs text-slate-200 group-hover:text-pink-400 transition-colors truncate">
                          {item.name}
                        </h5>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {item.sub}
                        </p>
                      </div>
                      <Instagram className="h-3.5 w-3.5 text-slate-600 group-hover:text-pink-500 shrink-0 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-navy-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-4">
          <div className="flex items-center space-x-1.5">
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <span>ดูแลและสนับสนุนระบบโดย สาขาวิชาเทคโนโลยีธุรกิจดิจิทัล</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>Made with</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
            <span>for MTC students</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
