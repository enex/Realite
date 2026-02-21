type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const SIZE_STYLES: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base"
};

function getInitials(name?: string | null, email?: string | null) {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/u).filter(Boolean);
    const initials = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    if (initials) {
      return initials;
    }
  }

  const localPart = email?.split("@")[0]?.trim();
  if (localPart) {
    return localPart.slice(0, 2).toUpperCase();
  }

  return "R";
}

export function UserAvatar({ name, email, image, size = "md", className = "" }: UserAvatarProps) {
  const initials = getInitials(name, email);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 font-semibold text-slate-700 ${SIZE_STYLES[size]} ${className}`}
      aria-hidden="true"
    >
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}
