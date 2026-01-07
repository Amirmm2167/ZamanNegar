// Types for non-standard APIs
interface BatteryManager {
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
}

interface NetworkInformation {
    effectiveType: string;
    rtt: number;
    downlink: number;
    saveData: boolean;
}

interface NavigatorWithExtras extends Navigator {
    getBattery?: () => Promise<BatteryManager>;
    connection?: NetworkInformation;
    deviceMemory?: number;
}

export interface RichContext {
    userAgent: string;
    screen: {
        width: number;
        height: number;
        pixelRatio: number;
        orientation: string;
    };
    network: {
        type: string;
        rtt: number;
        downlink: number;
        saveData: boolean;
    };
    hardware: {
        batteryLevel: number | null;
        isCharging: boolean | null;
        deviceMemory: number | null;
        cores: number;
    };
    timezone: string;
    timestamp: number;
}

export const getRichContext = async (): Promise<RichContext> => {
    if (typeof window === 'undefined') return {} as RichContext;

    const nav = navigator as NavigatorWithExtras;

    // 1. Battery (Async)
    let batteryInfo = { level: null as number | null, charging: null as boolean | null };
    try {
        if (nav.getBattery) {
            const battery = await nav.getBattery();
            batteryInfo = {
                level: battery.level,
                charging: battery.charging
            };
        }
    } catch (e) {
        // Battery API not supported or blocked
    }

    // 2. Network
    const conn = nav.connection || { effectiveType: 'unknown', rtt: 0, downlink: 0, saveData: false };

    // 3. Screen
    const screenData = {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio || 1,
        orientation: window.screen.orientation?.type || 'unknown'
    };

    return {
        userAgent: navigator.userAgent,
        screen: screenData,
        network: {
            type: conn.effectiveType,
            rtt: conn.rtt,
            downlink: conn.downlink,
            saveData: conn.saveData
        },
        hardware: {
            batteryLevel: batteryInfo.level,
            isCharging: batteryInfo.charging,
            deviceMemory: nav.deviceMemory || null,
            cores: navigator.hardwareConcurrency || 0
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: Date.now()
    };
};