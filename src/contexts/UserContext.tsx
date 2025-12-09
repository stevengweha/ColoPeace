import React, { createContext, useState } from "react";

type UserContextType = {
	user: any | null;
	setUser: (u: any | null) => void;
};

export const UserContext = createContext<UserContextType>({
	user: null,
	setUser: () => {}
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<any | null>(null);
	return (
		<UserContext.Provider value={{ user, setUser }}>
			{children}
		</UserContext.Provider>
	);
};
