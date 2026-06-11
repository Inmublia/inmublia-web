<script>
  import { Facebook, Instagram, Linkedin } from 'lucide-svelte';
  let { broker, isDark = false } = $props();
</script>

<div class="flex items-center justify-center gap-5 mt-4">
  {#if broker.facebook}
    <a href={broker.facebook} target="_blank" class="{isDark ? 'text-zinc-500 hover:text-zinc-100' : 'text-slate-400 hover:text-indigo-600'} transition-colors" aria-label="Facebook">
      <Facebook class="w-5 h-5" />
    </a>
  {/if}
  {#if broker.instagram}
    <a href={broker.instagram} target="_blank" class="{isDark ? 'text-zinc-500 hover:text-zinc-100' : 'text-slate-400 hover:text-indigo-600'} transition-colors" aria-label="Instagram">
      <Instagram class="w-5 h-5" />
    </a>
  {/if}
  {#if broker.linkedin}
    <a href={broker.linkedin} target="_blank" class="{isDark ? 'text-zinc-500 hover:text-zinc-100' : 'text-slate-400 hover:text-indigo-600'} transition-colors" aria-label="LinkedIn">
      <Linkedin class="w-5 h-5" />
    </a>
  {/if}
  {#if broker.tiktok}
    <a href={broker.tiktok} target="_blank" class="{isDark ? 'text-zinc-500 hover:text-zinc-100' : 'text-slate-400 hover:text-indigo-600'} transition-colors" aria-label="TikTok">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.22-1.15 4.39-2.92 5.75-1.84 1.4-4.29 1.83-6.6 1.4-2.18-.4-4.14-1.74-5.26-3.66-1.16-1.99-1.37-4.46-.57-6.57.82-2.18 2.67-3.9 4.88-4.57 1.59-.48 3.32-.46 4.88.08v4.06c-.84-.27-1.78-.34-2.65-.13-.88.21-1.67.75-2.18 1.48-.52.75-.71 1.72-.5 2.6.21.88.75 1.67 1.48 2.18.75.52 1.72.71 2.6.5 1.25-.29 2.21-1.36 2.45-2.62.06-.32.07-.65.07-.98V.02z"/></svg>
    </a>
  {/if}
</div>
