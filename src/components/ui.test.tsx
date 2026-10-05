// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { DetailRows, PlaylistCard, ThemeCard, WeatherCard } from "@/components/event/event-details";
import { StatusCapsule } from "@/components/ui/status-capsule";
import type { Weather } from "@/server/weather";

vi.mock("@/app/actions/live", () => ({ checkInAction: vi.fn() }));
const { codeFromScan } = await import("@/components/host/check-in-panel");

const forecast: Weather = { status: "forecast", day: "2026-12-12", high: 41, low: 30, precipitation: 10, kind: "partly", label: "Partly cloudy", unit: "F" };

describe("weather", () => {
  it("shows the forecast in the detail rows and the card", () => {
    render(<DetailRows venueName="Loft" venueAddress="Chicago, IL" weather={forecast} playlist={null} />);
    expect(screen.getByTestId("weather-row")).toHaveTextContent("41°");
    render(<WeatherCard weather={forecast} dayLabel="Saturday" />);
    expect(screen.getByTestId("weather-card")).toHaveTextContent("Partly cloudy");
  });

  it("explains when the forecast isn't available yet", () => {
    render(<WeatherCard weather={{ status: "too_far", availableFrom: "2026-11-26" }} dayLabel="Saturday" />);
    expect(screen.getByTestId("weather-card")).toHaveTextContent(/Forecast available/);
  });

  it("hides weather when it's unavailable", () => {
    render(<DetailRows venueName="Loft" venueAddress="" weather={{ status: "unavailable" }} playlist={null} />);
    expect(screen.queryByTestId("weather-row")).toBeNull();
    const { container } = render(<WeatherCard weather={{ status: "unavailable" }} dayLabel="Saturday" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("optional cards", () => {
  it("render nothing without content", () => {
    expect(render(<ThemeCard theme="" dressCode="" colors={[]} />).container).toBeEmptyDOMElement();
    expect(render(<PlaylistCard playlist={null} />).container).toBeEmptyDOMElement();
  });

  it("links to the playlist", () => {
    render(<PlaylistCard playlist={{ url: "https://music.apple.com/x", provider: "Apple Music" }} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://music.apple.com/x");
  });
});

describe("StatusCapsule", () => {
  it.each([
    ["pending", "Pending"],
    ["approved", "Approved"],
    ["confirmed", "Confirmed"],
    ["not_going", "Not going"],
  ] as const)("labels %s", (status, label) => {
    render(<StatusCapsule status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("codeFromScan", () => {
  it("reads the pass code from a check-in URL", () => {
    expect(codeFromScan("https://invithub.app/host/evt1/checkin/ABC234")).toBe("ABC234");
  });
  it("accepts a typed code", () => {
    expect(codeFromScan("  abc234 ")).toBe("abc234");
  });
});
