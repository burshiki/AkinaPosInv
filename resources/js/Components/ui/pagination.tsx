import { Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import type { PaginatedData } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    data: PaginatedData<unknown>;
}

export function Pagination({ data }: PaginationProps) {
    if (data.last_page <= 1) return null;

    return (
        <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
                Showing {data.from ?? 0} to {data.to ?? 0} of {data.total} results
            </div>
            <div className="flex items-center space-x-2">
                {data.links.map((link, index) => {
                    if (index === 0) {
                        return (
                            <Button
                                key="prev"
                                variant="outline"
                                size="sm"
                                disabled={!link.url}
                                asChild={!!link.url}
                            >
                                {link.url ? (
                                    <Link href={link.url} preserveState>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Link>
                                ) : (
                                    <span><ChevronLeft className="h-4 w-4" /></span>
                                )}
                            </Button>
                        );
                    }

                    if (index === data.links.length - 1) {
                        return (
                            <Button
                                key="next"
                                variant="outline"
                                size="sm"
                                disabled={!link.url}
                                asChild={!!link.url}
                            >
                                {link.url ? (
                                    <Link href={link.url} preserveState>
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                ) : (
                                    <span><ChevronRight className="h-4 w-4" /></span>
                                )}
                            </Button>
                        );
                    }

                    return (
                        <Button
                            key={index}
                            variant={link.active ? 'default' : 'outline'}
                            size="sm"
                            disabled={!link.url}
                            asChild={!!link.url}
                        >
                            {link.url ? (
                                <Link href={link.url} preserveState dangerouslySetInnerHTML={{ __html: link.label }} />
                            ) : (
                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                            )}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
