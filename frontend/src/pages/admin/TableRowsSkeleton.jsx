import Skeleton from '../../components/ui/Skeleton'

/*
 * The loading state for every table in the console.
 *
 * Four screens each carried their own copy of this - Users, Content and
 * Comments used six 44px bars, Activity used eight 36px ones - and all four
 * were wrong in the same two ways. A real `.ac-table` row is a `td` at
 * `padding: 12px 20px` around a 32px identity cell, so it stands about 56px
 * tall, and the table is full-bleed inside `.ac-table-wrap`. The copies were
 * shorter than that and sat inside `.ac-panel-body`, which adds 20px of
 * padding, so the whole table slid sideways the moment data arrived.
 *
 * This renders the real table element with a real header row, so the columns,
 * the padding and the row height are the loaded layout's own CSS.
 */
export default function TableRowsSkeleton({ columns = 5, rows = 6 }) {
    return (
        <div className="ac-table-wrap" aria-busy="true">
            <table className="ac-table">
                <thead>
                    <tr>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} scope="col">
                                <Skeleton h={10} w={i === 0 ? 72 : 56} radius={4} />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <tr key={r}>
                            {Array.from({ length: columns }).map((_, c) => (
                                <td key={c}>
                                    {c === 0 ? (
                                        // The first column is an identity cell
                                        // everywhere in the console: a 32px
                                        // avatar and two lines beside it.
                                        <div className="ac-user">
                                            <Skeleton w={32} h={32} circle />
                                            <div className="skeleton-stack">
                                                <Skeleton h={12} w={110} radius={4} />
                                                <Skeleton h={10} w={70} radius={4} />
                                            </div>
                                        </div>
                                    ) : (
                                        <Skeleton h={12} w={c === columns - 1 ? 64 : 96} radius={4} />
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
