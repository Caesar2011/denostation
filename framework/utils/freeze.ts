// Create a freeze factory
export function deepFreeze<T>(obj: T): T {
	// Our handler that rejects any change to the object and any nested objects inside it
	const rejector: ProxyHandler<any> = {
		get(obj, prop) {
			// If dealing with nested object, nest the proxy untill it reaches the direct property of it's parent proxy
			if (typeof obj[prop] === 'object' && obj[prop] !== null)
				return new Proxy(obj[prop], rejector);
			// If prop is directly accessible, just do the default operation
			else
				return obj[prop];
		},
		set(obj, prop, val, rec) {
			console.warn(`Can not set prop ${String(prop)} on freezed object`);
			// Return the proxy itself.
			// Note that we could return false, since returning false will create a TypeError, the latter code would always have to be inside a try-catch block which is immpossible and not flexbile.
			return rec;
		}
	}
	return new Proxy(obj, rejector);
}
