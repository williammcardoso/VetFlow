import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, ServerCrash, ShieldCheck, Stethoscope, UserRound, WifiOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const LoginPage: React.FC = () => {
  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [capsLockOn, setCapsLockOn] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Se já estiver autenticado (ex.: acessou /login direto por engano com a
  // sessão ainda válida), manda pra onde a pessoa tentava ir originalmente
  // (from) em vez de sempre forçar /dashboard — sem isso, esse efeito
  // sobrescrevia o redirecionamento certo do handleSubmit quando havia um
  // link direto (ex.: prontuário) que expirou a sessão no meio do caminho.
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || "/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  React.useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handlePasswordKeyboardState = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState("CapsLock"));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!isOnline) {
      const message = "Sem conexao com a internet. Verifique sua rede para continuar.";
      setErrorMessage(message);
      toast.error(message);
      return;
    }
    if (!username.trim() || !password) {
      const message = "Informe usuario e senha.";
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    try {
      await signIn(username, password, { remember: rememberMe });
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || "/dashboard", { replace: true });
      toast.success("Login realizado com sucesso.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao autenticar.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(var(--background))]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.008] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_95%_at_50%_120%,hsl(var(--foreground)/0.04),transparent_74%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <Card className="premium-card premium-card--soft relative w-full max-w-[540px] animate-in fade-in zoom-in-95 overflow-hidden border border-border/65 bg-card shadow-[0_26px_56px_-40px_hsl(var(--foreground)/0.44),0_14px_24px_-22px_hsl(var(--foreground)/0.24)] duration-300">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[hsl(var(--vf-clinical)/0.38)]" />

          <CardHeader className="border-b border-border/60 bg-muted/[0.12] px-6 pb-6 pt-6 sm:px-8">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-background text-[hsl(var(--vf-clinical))] shadow-sm">
                    <Stethoscope className="h-5 w-5" strokeWidth={1.9} />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[18px] font-semibold tracking-[-0.015em] text-foreground">VetFlow</p>
                    <p className="text-[11px] font-medium text-muted-foreground/90">Plataforma veterinária profissional</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/75">
                  <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--vf-clinical))]" />
                  Área autenticada
                </span>
              </div>

              <div className="space-y-2 text-left">
                <CardTitle className="text-[35px] font-semibold leading-[1.01] tracking-[-0.035em] text-foreground">Entrar no VetFlow</CardTitle>
                <CardDescription className="max-w-[430px] text-[13px] leading-relaxed text-muted-foreground/92">
                  Acesse sua área segura com suas credenciais profissionais.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative px-6 pb-6 pt-5 sm:px-8 sm:pb-7">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-[1.125rem]" noValidate>
              {!isOnline && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-800/90"
                >
                  <WifiOff className="h-4 w-4 shrink-0" />
                  Sem internet. O login requer conexão ativa.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-[13px] font-medium text-foreground/90">Usuário ou e-mail</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-[18px] h-4 w-4 text-muted-foreground/75" aria-hidden="true" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Digite seu usuário"
                    autoComplete="username"
                    className={cn(
                      "h-[54px] rounded-xl border-border/70 bg-muted/[0.12] pl-11 text-[15px] transition-all duration-200 placeholder:text-muted-foreground/66 focus-visible:border-[hsl(var(--vf-clinical)/0.58)] focus-visible:bg-background focus-visible:ring-[hsl(var(--vf-clinical)/0.18)]",
                      errorMessage && !username.trim() && "border-destructive/55 focus-visible:border-destructive/55 focus-visible:ring-destructive/20"
                    )}
                    aria-invalid={Boolean(errorMessage && !username.trim())}
                    aria-describedby={errorMessage ? "login-error-message" : undefined}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-medium text-foreground/90">Senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-[18px] h-4 w-4 text-muted-foreground/75" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyUp={handlePasswordKeyboardState}
                    onKeyDown={handlePasswordKeyboardState}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    className={cn(
                      "h-[54px] rounded-xl border-border/70 bg-muted/[0.12] pl-11 pr-[3.15rem] text-[15px] transition-all duration-200 placeholder:text-muted-foreground/66 focus-visible:border-[hsl(var(--vf-clinical)/0.58)] focus-visible:bg-background focus-visible:ring-[hsl(var(--vf-clinical)/0.18)]",
                      errorMessage && !password && "border-destructive/55 focus-visible:border-destructive/55 focus-visible:ring-destructive/20"
                    )}
                    aria-invalid={Boolean(errorMessage && !password)}
                    aria-describedby={errorMessage ? "login-error-message" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/45 bg-card text-muted-foreground/78 transition-all duration-200 hover:border-border/65 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vf-clinical)/0.2)]"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {capsLockOn && (
                  <p className="inline-flex items-center gap-1 text-xs text-amber-800/90">
                    <KeyRound className="h-3.5 w-3.5" />
                    Caps Lock ativado
                  </p>
                )}
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm leading-none text-muted-foreground/95">
                  <Checkbox
                    checked={rememberMe}
                    onCheckedChange={(value) => setRememberMe(Boolean(value))}
                    className="mt-0"
                  />
                  Manter conectado
                </label>
                <button
                  type="button"
                  onClick={() => toast.info("Recuperação de senha será disponibilizada em breve.")}
                  className="text-sm font-medium leading-none text-[hsl(var(--vf-clinical))] transition-colors hover:text-[hsl(var(--vf-clinical)/0.86)] hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>

              {errorMessage && (
                <div
                  id="login-error-message"
                  role="alert"
                  aria-live="assertive"
                  className="animate-in fade-in-50 slide-in-from-top-1 flex items-start gap-2 rounded-lg border border-destructive/14 bg-destructive/[0.045] px-3 py-2.5 text-[13px] text-destructive/85 duration-200"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                className="mt-1 h-[54px] w-full rounded-xl bg-[hsl(var(--vf-clinical))] text-[15px] font-semibold text-white shadow-[0_10px_18px_-14px_hsl(var(--vf-clinical)/0.85)] transition-all duration-300 hover:-translate-y-[1px] hover:bg-[hsl(var(--vf-clinical)/0.92)] hover:shadow-[0_12px_22px_-14px_hsl(var(--vf-clinical)/0.9)] focus-visible:ring-2 focus-visible:ring-[hsl(var(--vf-clinical)/0.32)]"
                disabled={loading || !isOnline}
                aria-busy={loading}
              >
                {loading ? "Validando credenciais..." : "Entrar"}
              </Button>

              <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-muted-foreground/88">
                <span className="tracking-[0.01em]">Sessão protegida por política interna.</span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground/82">
                  <span className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-emerald-500" : "bg-amber-500")} />
                  {!isOnline && <ServerCrash className="h-3 w-3" />}
                  {isOnline ? "Conexão ativa" : "Conexão limitada"}
                </span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
