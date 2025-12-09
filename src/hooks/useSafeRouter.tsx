import { usePathname as useExpoPathname, useRouter as useExpoRouter } from "expo-router";

/**
 * useSafeRouter — wrapper qui évite les crashs lorsque le composant est rendu en dehors du contexte expo-router.
 * Renvoie des méthodes no-op si useRouter/usePathname lancent une erreur.
 */
export function useSafeRouter() {
	// on encapsule l'appel dans try/catch — l'appel au hook est effectué toujours au même emplacement.
	try {
		return useExpoRouter();
	} catch (err) {
		// stub minimal
		return {
			push: (_: string) => {},
			replace: (_: string) => {},
			back: () => {},
			prefetch: (_: string) => {},
		} as any;
	}
}

export function useSafePathname(): string {
	try {
		return useExpoPathname();
	} catch (err) {
		return "";
	}
}
