import { Review } from '@/types';
import ProfilePicture from '../ProfilePicture';
import Link from 'next/link';

interface ReviewCardProps {
    review: Review;
    enableLink?: boolean;
}

export default function ReviewCard({ review, enableLink = true }: ReviewCardProps) {
    // Early return if essential data is missing
    if (!review?.essay?.id || !review?.essay?.author) {
        return null;
    }

    const CardContent = (
        <div className={`card bg-base-100 shadow-xl ${enableLink ? 'hover:shadow-2xl transition-shadow' : ''}`}>
            <div className="card-body">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {enableLink ? (
                            <>
                                <ProfilePicture
                                    src={review.author?.profile_picture_url || ''}
                                    size={48}
                                    alt={`${review.author?.name || 'Anonymous'}'s profile picture`}
                                />
                                <div className="flex flex-col">
                                    <span className="font-semibold text-lg">
                                        {review.author?.name || 'Anonymous'}
                                    </span>
                                    <span className="text-sm text-base-content/60">
                                        in reply to{' '}
                                        <span className="underline">
                                            {review.essay.author.name || 'Unknown Author'}
                                        </span>
                                    </span>
                                </div>
                            </>
                        ) : (
                            <Link
                                href={`/authors/${review.author?.id}`}
                                className="flex items-center gap-3 no-underline"
                            >
                                <ProfilePicture
                                    src={review.author?.profile_picture_url || ''}
                                    size={48}
                                    alt={`${review.author?.name || 'Anonymous'}'s profile picture`}
                                />
                                <div className="flex flex-col">
                                    <span className="font-semibold text-lg">
                                        {review.author?.name || 'Anonymous'}
                                    </span>
                                    <span className="text-sm text-base-content/60">
                                        in reply to{' '}
                                        <span className="underline">
                                            {review.essay.author.name || 'Unknown Author'}
                                        </span>
                                    </span>
                                </div>
                            </Link>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-base-content/60">
                        <time>
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </time>
                    </div>
                </div>

                <p className="mt-4 text-base-content/80">{review.content}</p>
            </div>
        </div>
    );

    return enableLink ? (
        <Link href={`/essays/${review.essay.id}`} className="block no-underline">
            {CardContent}
        </Link>
    ) : CardContent;
}
