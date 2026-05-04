import { Briefcase, Github, Linkedin, Mail, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer id="contact" className="border-t border-border/60 bg-card">
      <div className="container py-14">
        <div className="mb-10 grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-hero shadow-soft">
                <Briefcase className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
              AI-powered job recommendations to help you find the perfect career match faster and smarter.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-smooth hover:gradient-hero hover:text-primary-foreground"
                  aria-label="social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#about" className="hover:text-primary transition-smooth">About</a></li>
              <li><a href="#" className="hover:text-primary transition-smooth">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-smooth">Blog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-smooth">Privacy</a></li>
              <li><a href="#" className="hover:text-primary transition-smooth">Terms</a></li>
              <li><a href="#contact" className="hover:text-primary transition-smooth">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground md:flex-row">
          <p>Copyright {new Date().getFullYear()} All rights reserved.</p>
          <p>Crafted with care for your career.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
