import { Link } from 'react-router'
import { FaLinkedin } from '../ui/icons'
export default function SiteFooter({ onReportBug }) {
    return (
        <footer className="site-footer">
            <div className="site-footer__inner">
                <div className="site-footer__links">
                    <Link to="/about" className="site-footer__link">About</Link>
                    <span className="footer-dot" />
                    <Link to="/help" className="site-footer__link">Help</Link>
                    <span className="footer-dot" />
                    <Link to="/legal/privacy" className="site-footer__link">Privacy</Link>
                    <span className="footer-dot" />
                    <Link to="/legal/terms" className="site-footer__link">Terms</Link>
                    <span className="footer-dot" />
                    <button onClick={onReportBug} className="site-footer__link">Report Bug</button>
                </div>

                <div className="site-footer__developer">
                    <span className="dev-text">Developed by</span>
                    <a
                        href="https://www.linkedin.com/in/syedmukheeth"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dev-link"
                    >
                        <FaLinkedin size={16} />
                        <span>Syed Mukheeth</span>
                    </a>
                </div>

                <div className="site-footer__copyright">
                    © 2026 PEERNET FROM INDIA
                </div>
            </div>
        </footer>
    )
}
