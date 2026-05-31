import { Cpu, Lock, Sparkles, Zap } from 'lucide-react'

export function Features() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-5xl space-y-12 px-6">
                <div className="relative z-10 grid items-center gap-4 md:grid-cols-2 md:gap-12">
                    <h2 className="text-4xl font-semibold">The Lyra ecosystem brings together our models</h2>
                    <p className="max-w-sm sm:ml-auto text-muted-foreground">Empower your team with workflows that adapt to your needs, whether you prefer git synchronization or a AI Agents interface.</p>
                </div>
                <div className="relative rounded-3xl p-3 md:-mx-8 lg:col-span-3">
                    <div className="aspect-[88/36] relative overflow-hidden rounded-3xl">
                        <div className="bg-gradient-to-t z-20 from-background absolute inset-0 to-transparent"></div>
                        <img 
                            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80" 
                            className="absolute inset-0 z-10 w-full h-full object-cover rounded-3xl" 
                            alt="Ecosystem illustration" 
                        />
                        <img 
                            src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=2000&q=80" 
                            className="hidden dark:block absolute inset-0 w-full h-full object-cover rounded-3xl" 
                            alt="Ecosystem graphic dark background" 
                        />
                        <img 
                            src="https://images.unsplash.com/photo-1640137595328-97ff7b12d5f0?auto=format&fit=crop&w=2000&q=80" 
                            className="dark:hidden absolute inset-0 w-full h-full object-cover rounded-3xl" 
                            alt="Ecosystem graphic light background" 
                        />
                    </div>
                </div>
                <div className="relative mx-auto grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Zap className="size-4" />
                            <h3 className="text-sm font-medium">Faaast</h3>
                        </div>
                        <p className="text-muted-foreground text-sm">It supports an entire helping developers and innovate.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Cpu className="size-4" />
                            <h3 className="text-sm font-medium">Powerful</h3>
                        </div>
                        <p className="text-muted-foreground text-sm">It supports an entire helping developers and businesses.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Lock className="size-4" />
                            <h3 className="text-sm font-medium">Security</h3>
                        </div>
                        <p className="text-muted-foreground text-sm">It supports an helping developers businesses innovate.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="size-4" />
                            <h3 className="text-sm font-medium">AI Powered</h3>
                        </div>
                        <p className="text-muted-foreground text-sm">It supports an helping developers businesses innovate.</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
