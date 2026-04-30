import { Briefcase, Twitter, Linkedin, Github, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer id="contact" className="border-t border-border/60 bg-card">
      <div className="container py-14">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-hero shadow-soft">
                <Briefcase className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">
                Job<span className="text-gradient">Reco</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
              AI-powered job recommendations to help you find the perfect career match — faster and smarter.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center hover:gradient-hero hover:text-primary-foreground transition-smooth text-muted-foreground"
                  aria-label="social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#about" className="hover:text-primary transition-smooth">About</a></li>
              <li><a href="#" className="hover:text-primary transition-smooth">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-smooth">Blog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-smooth">Privacy</a></li>
              <li><a href="#" className="hover:text-primary transition-smooth">Terms</a></li>
              <li><a href="#contact" className="hover:text-primary transition-smooth">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} JobReco. All rights reserved.</p>
          <p>Crafted with care for your career.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
