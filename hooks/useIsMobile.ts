import useMediaQuery from '@/hooks/useMediaQuery';

export default function useIsMobile(breakpoint = 767) {
  return useMediaQuery(`(max-width: ${breakpoint}px)`);
}
