import React from "react";

interface UserProfileOGProps {
  userName: string;
  userImage?: string | null;
  plansCount: number;
  upcomingPlans: Array<{
    title: string;
    startDate: string;
    activity?: string;
  }>;
}

export default function UserProfileOG({
  userName,
  userImage,
  plansCount,
  upcomingPlans,
}: UserProfileOGProps) {
  const topPlans = upcomingPlans.slice(0, 3);

  return (
    <div
      style={{
        fontSize: 40,
        color: "white",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        width: "100%",
        height: "100%",
        padding: "60px 80px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "40px",
        }}
      >
        {userImage ? (
          <img
            src={userImage}
            alt={userName}
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "60px",
              border: "4px solid white",
            }}
          />
        ) : (
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "60px",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "60px",
              border: "4px solid white",
            }}
          >
            👤
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: "700",
              margin: "0 0 16px 0",
              color: "white",
            }}
          >
            {userName}
          </h1>
          <p
            style={{
              fontSize: "32px",
              margin: "0",
              color: "rgba(255, 255, 255, 0.9)",
            }}
          >
            {plansCount} {plansCount === 1 ? "Plan" : "Pläne"} geplant
          </p>
        </div>
      </div>

      {/* Upcoming Plans */}
      {topPlans.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            marginTop: "40px",
          }}
        >
          <h2
            style={{
              fontSize: "36px",
              fontWeight: "600",
              margin: "0",
              color: "rgba(255, 255, 255, 0.95)",
            }}
          >
            Kommende Pläne:
          </h2>
          {topPlans.map((plan, index) => (
            <div
              key={index}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: "16px",
                padding: "24px 32px",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "24px",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "6px",
                  backgroundColor: "white",
                }}
              />
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "600",
                    margin: "0 0 8px 0",
                    color: "white",
                  }}
                >
                  {plan.title}
                </p>
                <p
                  style={{
                    fontSize: "24px",
                    margin: "0",
                    color: "rgba(255, 255, 255, 0.8)",
                  }}
                >
                  {new Date(plan.startDate).toLocaleDateString("de-DE", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "40px",
        }}
      >
        <p
          style={{
            fontSize: "28px",
            color: "rgba(255, 255, 255, 0.9)",
            margin: "0",
          }}
        >
          realite.app
        </p>
      </div>
    </div>
  );
}
